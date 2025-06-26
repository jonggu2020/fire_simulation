const turf = require('@turf/turf');
const db = require('../firebaseAdmin');
const { mountainStationsData } = require('../mountainStations');

// 인메모리 캐시 선언
const simulationCache = new Map();

// 상수 정의
const KOREA_GRID_TABLE = 'imported_fire_data_auto';
const FIREBREAK_DISTANCE_KM = 1.5; // 이 거리 이상은 '방지턱'으로 간주
const STRONG_WIND_MS = 10;         // 이 풍속 이상은 방지턱을 넘을 수 있는 '강풍'
const ONE_GRID_UNIT_KM = 1.2;      // 격자 한 칸의 기준 거리

// --- 모델 계산 함수들 ---

/**
 * 임상도 코드를 기반으로 연료량 점수를 반환합니다.
 * 이 점수는 확산 속도와 연소 시간의 기본값이 됩니다.
 * @param {string} imsangdoCode - 임상도임종코드 (예: '1'은 침엽수림)
 * @returns {number} 연료량 점수 (높을수록 가연성이 높음)
 */
const getFuelScore = (imsangdoCode) => imsangdoCode ? ({'1':5,'3':4,'2':3,'4':2}[imsangdoCode] ?? 0) : 0;


/**
 * 토양지형그룹코드를 기반으로 경사도 요인을 반환합니다.
 * 오르막에서는 가중치를, 내리막에서는 페널티를 부여합니다.
 * @param {string} code1 - 토양지형그룹코드
 * @returns {number} 경사도에 따른 확산 계수
 */
const getSlopeFactor = (code1) => {
    if(!code1) return 1.0;
    return {'01':1.5,'02':1.5,'03':1.5,'08':1.5,'12':1.5,'04':0.8,'05':0.8,'06':0.8,'07':0.8,'11':0.8,'10':0.5}[code1] ?? 1.0;
}

/**
 * 실시간 습도와 토양 코드를 조합하여 건조도 요인을 계산합니다.
 * 습도가 낮고 토양이 건조할수록 확산 속도가 빨라집니다.
 * @param {string} soilCode - 토양배수등급코드
 * @param {number} humidity - 현재 습도 (%)
 * @returns {number} 건조도에 따른 확산 계수
 */
const getMoistureFactor = (soilCode, humidity) => {
    let factor = 1.0;
    // 습도에 따른 기본 계수 설정 (페널티 포함)
    if (humidity < 35) factor = 1.5;
    else if (humidity < 50) factor = 1.2;
    else if (humidity > 80) factor = 0.4;
    else if (humidity > 70) factor = 0.6;
    
    if(!soilCode) return factor;

    // 토양 배수 등급(건조도)에 따른 가중치 적용
    if (['01','02','05','06','07','08','09','10','11','13','14','15','16','17','18','19','23','24'].includes(soilCode)) return factor * 1.2;
    if (['03','12','20'].includes(soilCode)) return factor * 0.8;
    // 물, 시가지 등 비가연성 지역에서는 확산 계수를 0으로 만듦
    if (['82','91','92','93','94','95','97','99','27','28','29'].includes(soilCode)) return 0;
    return factor;
}

/**
 * 피해도(연소 시간)를 계산합니다.
 * 기본 연소 시간은 연료량에 비례하지만, 습도나 비화(Spotting) 거리에 따라 페널티를 받습니다.
 * @param {number} fuelScore - 연료량 점수
 * @param {number} humidity - 현재 습도 (%)
 * @param {number} [distance=0] - 이전 지점으로부터의 거리 (km)
 * @returns {number} 최종 연소 지속 시간 (초)
 */
const getBurnoutDuration = (fuelScore, humidity, distance = 0) => {
    let baseDuration = fuelScore * 1200; 

    // 습도 페널티: 습도가 높을수록 연소 시간이 짧아짐
    if (humidity > 80) {
        baseDuration *= 0.5;
    } else if (humidity > 70) {
        baseDuration *= 0.7;
    }

    // 거리 페널티: 먼 거리를 건너뛴 불씨는 오래 타지 못함
    const jumpUnits = distance / ONE_GRID_UNIT_KM;
    if (jumpUnits >= 2) {
        const distancePenaltyFactor = Math.max(1, jumpUnits - 1);
        baseDuration /= distancePenaltyFactor;
        console.log(`   -> ${jumpUnits.toFixed(1)}칸(${distance.toFixed(2)}km) 비화 발생! 연소 시간 페널티 적용.`);
    }

    return baseDuration;
}

/**
 * 풍향/풍속과 산불 진행 방향의 관계를 계산하여 바람 요인을 반환합니다.
 * 순풍일 때 가장 큰 가속도를 얻습니다.
 * @param {number} windSpeed - 풍속 (m/s)
 * @param {number} windDirection - 풍향 (도)
 * @param {number} bearing - 산불 진행 방향 (도)
 * @returns {number} 바람에 따른 확산 계수
 */
const getWindFactor = (windSpeed, windDirection, bearing) => {
    const angleDiff = Math.abs((windDirection - bearing + 180) % 360 - 180);
    let factor = 1.0;
    if (angleDiff < 45) factor += (windSpeed / 4);
    else if (angleDiff < 90) factor += (windSpeed / 8);
    return Math.max(0.5, factor);
}

/**
 * 우선순위 큐 클래스. 시뮬레이션에서 다음 이벤트를 효율적으로 관리합니다.
 */
class PriorityQueue {
    constructor() { this.elements = []; }
    enqueue(element, priority) { this.elements.push({ element, priority }); this.sort(); }
    dequeue() { return this.elements.shift().element; }
    sort() { this.elements.sort((a, b) => a.priority - b.priority); }
    isEmpty() { return this.elements.length === 0; }
}

/**
 * 특정 지점에서 가장 가까운 8개의 이웃 후보 지점을 찾습니다.
 * @param {object} currentPoint - 현재 지점 객체
 * @param {Array<object>} allPoints - 모든 지점 데이터 배열
 * @returns {Array<number>} 이웃 지점의 ID 배열
 */
const findNeighbors = (currentPoint, allPoints) => {
    const searchRadius = 0.03;
    const [lon, lat] = currentPoint.coordinates;
    const candidates = allPoints
        .filter(p => p.id !== currentPoint.id && p.lat > lat - searchRadius && p.lat < lat + searchRadius && p.lng > lon - searchRadius && p.lng < lon + searchRadius)
        .map(p => ({ point: p, dist: turf.distance(currentPoint.coordinates, p.coordinates) }))
        .filter(item => item.dist > 0 && item.dist < 5.0)
        .sort((a, b) => a.dist - b.dist);
    return candidates.slice(0, 8).map(item => item.point.id);
}


/**
 * 산불 확산 시뮬레이션의 메인 로직을 수행합니다.
 * @param {object} pool - DB 커넥션 풀
 * @param {number} ignition_id - 최초 발화점 ID
 * @returns {Promise<Array<object>>} 시뮬레이션 결과가 포함된 GeoJSON Feature 배열
 */
const runFireSpreadPrediction = async (pool, ignition_id) => {
    // 1. 캐시 확인
    const cacheKey = `prediction-${ignition_id}`; // 캐시 키 명확화
    if (simulationCache.has(cacheKey)) {
        console.log(`Cache hit for ${cacheKey}. Returning cached result.`);
        return simulationCache.get(cacheKey);
    }
    console.log(`Cache miss for ${cacheKey}. Running simulation.`);

    const startTime = Date.now();
    let connection;
    try {
        // 1. DB에서 모든 격자점 데이터를 불러옵니다.
        connection = await pool.getConnection();
        const [rows] = await connection.query(`SELECT id, lat, lng, imsangdo_frtp_cd, soil_tpgrp_tpcd, soil_sltp_cd FROM ${KOREA_GRID_TABLE}`);
        const allPoints = rows.map(row => ({...row, coordinates: [parseFloat(row.lng), parseFloat(row.lat)]}));
        const pointMap = new Map(allPoints.map(p => [p.id, p]));
        const ignitionPoint = pointMap.get(ignition_id);

        if (!ignitionPoint) {
            throw new Error('발화점 데이터를 찾을 수 없습니다.');
        }

        // 2. 가장 가까운 관측소를 찾아 실시간 기상 데이터를 불러옵니다.
        const nearestStation = mountainStationsData.reduce((p, c) => (turf.distance(ignitionPoint.coordinates, [c.longitude, c.latitude]) < turf.distance(ignitionPoint.coordinates, [p.longitude, p.latitude]) ? c : p));
        const weatherRef = db.ref(`weatherdata/${nearestStation.obsid}`);
        const snapshot = await weatherRef.once('value');
        const weatherData = snapshot.val() || {};
        const humidity = weatherData.hm2m ?? 50, windSpeed = weatherData.ws2m ?? 3, windDirection = weatherData.wd2m ?? 0;
        
        console.log(` -> 날씨 정보 로드 완료 (관측소: ${nearestStation.name}, 습도: ${humidity}%, 풍속: ${windSpeed}m/s, 풍향: ${windDirection}°)`);
        
        // 3. 시뮬레이션 초기 설정 (모든 지점 초기화, 최초 발화점 설정)
        const simResults = new Map();
        allPoints.forEach(p => simResults.set(p.id, { ignitionTime: null, burnoutTime: null }));
        const eventQueue = new PriorityQueue(); // 이벤트 큐 생성
        const initialIgnitionResult = simResults.get(ignition_id);
        initialIgnitionResult.ignitionTime = 0;
        initialIgnitionResult.burnoutTime = getBurnoutDuration(getFuelScore(ignitionPoint.imsangdo_frtp_cd), humidity);
        eventQueue.enqueue(ignition_id, 0); // 최초 발화 이벤트를 큐에 추가
        
        // 4. 시뮬레이션 루프 실행 (이벤트 큐가 빌 때까지)
        console.log(` -> 시뮬레이션 루프 시작...`);
        while (!eventQueue.isEmpty()) {
            const currentPointId = eventQueue.dequeue();
            const currentPoint = pointMap.get(currentPointId);
            const currentResult = simResults.get(currentPointId);
            
            console.log(`Processing point: ${currentPointId}, ignitionTime: ${currentResult.ignitionTime}`); // Added log

            if (currentResult.ignitionTime > 7 * 3600) { // Changed from 12 * 3600 to 7 * 3600
                console.log(`Point ${currentPointId} exceeded max simulation time (7 hours). Skipping.`); // Updated log message
                continue;
            }

            const neighborIds = findNeighbors(currentPoint, allPoints);

            for (const neighborId of neighborIds) {
                const neighbor = pointMap.get(neighborId);
                const neighborResult = simResults.get(neighborId);

                if (neighborResult.ignitionTime != null) {
                    // console.log(`Neighbor ${neighborId} already ignited. Skipping.`); // Optional: too verbose
                    continue; 
                }

                // 4-1. 이웃 지점의 물리적 특성 계산
                const fuelScore = getFuelScore(neighbor.imsangdo_frtp_cd);
                if (fuelScore === 0) {
                    console.log(`Neighbor ${neighborId} has no fuel (fuelScore: 0). Skipping.`); // Added log
                    continue; 
                }

                const distance = turf.distance(currentPoint.coordinates, neighbor.coordinates);
                
                // 4-2. 방지턱 및 비화 규칙 적용
                if (distance > FIREBREAK_DISTANCE_KM && windSpeed < STRONG_WIND_MS) {
                    console.log(`Neighbor ${neighborId} skipped due to firebreak (distance: ${distance.toFixed(2)}km, windSpeed: ${windSpeed}m/s).`); // Added log
                    continue; 
                }

                const bearing = turf.bearing(currentPoint.coordinates, neighbor.coordinates);
                let slopeFactor = getSlopeFactor(neighbor.soil_tpgrp_tpcd);
                let moistureFactor = getMoistureFactor(neighbor.soil_sltp_cd, humidity);
                const windFactor = getWindFactor(windSpeed, windDirection, bearing);

                // 비화 시 페널티 적용
                if (distance > FIREBREAK_DISTANCE_KM) {
                    console.log(`Applying spotting penalty for neighbor ${neighborId} (distance: ${distance.toFixed(2)}km).`); // Added log
                    slopeFactor = Math.pow(slopeFactor, 0.5); 
                    moistureFactor = Math.pow(moistureFactor, 0.5);
                }

                // 4-3. 최종 확산 속도(ROS) 및 시간 계산
                const rosScore = fuelScore * slopeFactor * moistureFactor * windFactor;
                console.log(`Neighbor ${neighborId} - Fuel: ${fuelScore}, Slope: ${slopeFactor.toFixed(2)}, Moisture: ${moistureFactor.toFixed(2)}, Wind: ${windFactor.toFixed(2)}, ROS: ${rosScore.toFixed(2)}`); // Added log

                if (rosScore < 1) { // Changed from rosScore < 2 to rosScore < 1
                    console.log(`Neighbor ${neighborId} has low ROS (${rosScore.toFixed(2)}). Skipping.`); // Added log
                    continue;
                }

                const timeToTravel = (distance * 3600) / rosScore; // distance in km, ROS in km/hr -> time in seconds
                const newIgnitionTime = currentResult.ignitionTime + timeToTravel;
                
                console.log(`Neighbor ${neighborId} - Distance: ${distance.toFixed(2)}km, TimeToTravel: ${timeToTravel.toFixed(2)}s, NewIgnitionTime: ${newIgnitionTime.toFixed(2)}s`); // Added log


                // 4-4. 이웃 지점 발화 정보 업데이트 및 이벤트 큐에 추가
                if (newIgnitionTime < (neighborResult.ignitionTime ?? Infinity)) {
                    console.log(`Igniting neighbor ${neighborId} at ${newIgnitionTime.toFixed(2)}s.`); // Added log
                    neighborResult.ignitionTime = newIgnitionTime;
                    neighborResult.burnoutTime = newIgnitionTime + getBurnoutDuration(fuelScore, humidity, distance);
                    eventQueue.enqueue(neighborId, newIgnitionTime);
                } else {
                    console.log(`Neighbor ${neighborId} not ignited. NewTime (${newIgnitionTime.toFixed(2)}) vs ExistingTime (${neighborResult.ignitionTime ?? 'Infinity'})`); // Added log
                }
            }
        }
        
        console.log(` -> 시뮬레이션 루프 종료. 총 소요 시간: ${(Date.now() - startTime)/1000}초`);
        
        const ignitedFeatures = allPoints
            .filter(p => simResults.get(p.id).ignitionTime !== null)
            .map(p => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: p.coordinates },
                properties: { id: p.id, ...simResults.get(p.id) }
            }));
        
        console.log(`Returning ${ignitedFeatures.length} ignited features out of ${allPoints.length} total points.`);

        // 시간대별 경계 생성
        const timeBoundaries = [];
        const timeStep = 600; // 10분 간격 (초)
        // 실제 시뮬레이션된 최대 발화 시간 또는 설정된 최대 시뮬레이션 시간을 기준으로 루프
        const maxIgnitionTime = ignitedFeatures.reduce((max, f) => Math.max(max, f.properties.ignitionTime || 0), 0);
        const effectiveMaxSimTime = Math.max(maxIgnitionTime, 7 * 3600); // 최소 7시간 또는 실제 최대 발화 시간까지 커버

        for (let t = 0; t <= effectiveMaxSimTime; t += timeStep) {
            const pointsIgnitedByTimeT = ignitedFeatures.filter(f => 
                f.properties.ignitionTime !== null && f.properties.ignitionTime <= t
            );

            if (pointsIgnitedByTimeT.length >= 3) {
                try {
                    const pointsForHull = turf.featureCollection(pointsIgnitedByTimeT.map(f => turf.point(f.geometry.coordinates)));
                    const hull = turf.convex(pointsForHull);
                    if (hull) {
                        timeBoundaries.push({ time: t, polygon: hull });
                    }
                } catch (error) {
                    console.error(`Error calculating convex hull at time ${t}:`, error);
                }
            } else if (pointsIgnitedByTimeT.length > 0) {
                // 점이 1~2개일 경우, 작은 버퍼를 생성하여 폴리곤으로 표현
                try {
                    const bufferedFeatures = pointsIgnitedByTimeT.map(f => turf.buffer(f, 0.01, { units: 'kilometers' })); // 10m 버퍼
                    // [수정] union 로직을 더 안정적인 reduce 방식으로 변경
                    let combinedPolygon = bufferedFeatures.reduce((acc, feat) => {
                        // acc가 null(첫번째 순회)이면 현재 feat를 반환하고,
                        // 그렇지 않으면 acc와 현재 feat를 합침
                        if (!acc) return feat;
                        return turf.union(acc, feat);
                    }, null);

                    if (combinedPolygon) {
                         timeBoundaries.push({ time: t, polygon: combinedPolygon });
                    }
                } catch (bufferError) { console.error(`Error creating buffer/union for 1-2 points at time ${t}:`, bufferError); }
            }
        }
        console.log(`Generated ${timeBoundaries.length} time-series boundaries.`);

        const result = { features: ignitedFeatures, timeBoundaries: timeBoundaries };
        simulationCache.set(cacheKey, result);
        return result;
    } finally {
        if (connection) connection.release();
    }
};


/**
 * DB에서 지도에 표시할 전체 격자 데이터를 가져옵니다.
 * @param {object} pool - DB 커넥션 풀
 * @returns {Promise<Array<object>>} GeoJSON Feature 배열
 */
const getGridData = async (pool) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(`SELECT id, lat, lng FROM ${KOREA_GRID_TABLE}`);
        return rows.map(row => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [parseFloat(row.lng), parseFloat(row.lat)] },
            properties: { id: row.id }
        }));
    } finally {
        if (connection) connection.release();
    }
};




// [추가] 미리 계산된 연료 등급 데이터를 DB에서 가져오는 함수
const getGridWithFuelInfo = async (pool) => {
    let connection;
    try {
        connection = await pool.getConnection();
        // 두 테이블을 JOIN하여 위경도 정보와 미리 계산된 연료 점수를 함께 가져옵니다.
        const sql = `
            SELECT 
                t1.id, 
                t1.lat, 
                t1.lng, 
                t2.fuel_score 
            FROM 
                imported_fire_data_auto AS t1
            JOIN 
                grid_fuel_ratings AS t2 ON t1.id = t2.grid_id
        `;
        const [rows] = await connection.query(sql);
        return rows;
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { runFireSpreadPrediction, getGridData, getFuelScore, getGridWithFuelInfo };