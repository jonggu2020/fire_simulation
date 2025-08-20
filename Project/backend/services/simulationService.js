// backend/services/simulationService.js

const turf = require('@turf/turf');
const { db } = require('../firebaseAdmin');
const { mountainStationsData } = require('../mountainStations');
const axios = require('axios');
const TinyQueue = require('tinyqueue').default;
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const pool = require('../config/db'); // MySQL pool

const KOREA_GRID_TABLE = 'imported_fire_data_auto';
const PREDICTION_SERVER_URL = 'http://127.0.0.1:5000';
const simulationCache = new Map();

const SIMULATION_SCENARIOS = {
    '소형': { MAX_IGNITED_CELLS: 70,   MAX_ROS: 8.0,  DURATION_FACTOR: 0.5 },
    '중형': { MAX_IGNITED_CELLS: 250,  MAX_ROS: 12.0, DURATION_FACTOR: 1.5 },
    '대형': { MAX_IGNITED_CELLS: 1000, MAX_ROS: 20.0, DURATION_FACTOR: 20.0 },
    '알수없음': { MAX_IGNITED_CELLS: 200, MAX_ROS: 10.0, DURATION_FACTOR: 1.0 }
};

const REALISM_FACTOR = 0.25;
const DNN_FACTOR_MIN = 0.5;
const DNN_FACTOR_MAX = 2.0;
const SIMILARITY_THRESHOLD = 0.70;
const MINIMUM_ROS_TO_SPREAD = 0.05;

let historicalFireStarts = [];

// loadHistoricalFireStarts 함수 (CSV 버전)
async function loadHistoricalFireStarts() {
    if (historicalFireStarts.length > 0) return;

    const csvFilePath = path.join(__dirname, '..', 'data', 'training_dataset_final.csv');
    console.log(`CSV 파일에서 과거 산불 사례 데이터 로딩 시작: ${csvFilePath}`);

    const allRows = await new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', (error) => reject(error));
    });
    console.log(`CSV 파일에서 총 ${allRows.length}개의 행을 읽었습니다.`);

    const filteredRows = allRows.filter(row => row.status !== 'excluded');
    console.log(` -> 제외된 데이터를 필터링 후 ${filteredRows.length}개의 행을 처리합니다.`);

    filteredRows.forEach(row => {
        if (!row.event_id || row.event_id.trim() === '') return;
        for (const key in row) {
            if (!isNaN(row[key]) && row[key] !== '') {
                row[key] = parseFloat(row[key]);
            }
        }
    });

    const SMALL_FIRE_THRESHOLD = 50;
    const MEDIUM_FIRE_THRESHOLD = 200;

    filteredRows.forEach(startInfo => {
        const count = startInfo.cell_count || 1;
        if (count <= SMALL_FIRE_THRESHOLD) startInfo.fire_class = '소형';
        else if (count <= MEDIUM_FIRE_THRESHOLD) startInfo.fire_class = '중형';
        else startInfo.fire_class = '대형';
    });

    historicalFireStarts = filteredRows;
    console.log(`✅ ${historicalFireStarts.length}개의 과거 산불 시작점 로딩 및 등급 분류 완료.`);
}



// loadHistoricalFireStarts 함수 아래에 추가해주세요.

async function reloadHistoricalFireStarts() {
    historicalFireStarts = []; // 메모리 캐시 비우기
    await loadHistoricalFireStarts(); // DB에서 다시 로드
    console.log('과거 산불 데이터를 DB에서 다시 로드하여 갱신했습니다.');
}






async function preClassifyFire(features) {
    try {
        const response = await axios.post(`${PREDICTION_SERVER_URL}/pre_classify`, features);
        return response.data;
    } catch (error) {
        console.error('Python 사전 분류 서버 호출 오류:', error.response ? error.response.data : error.message);
        return { predicted_fire_class: '알수없음', confidence_percent: 0 };
    }
}

async function getPredictionFromDNN(features) {
    try {
        const response = await axios.post(`${PREDICTION_SERVER_URL}/predict`, features);
        return response.data.predicted_spread_factor || 1.0;
    } catch (error) {
        console.error('Python 예측 서버 호출 오류:', error.response ? error.response.data : error.message);
        return 1.0;
    }
}


//유사도 검사 점수 각각(습도/풍속/온도) 영향력
function calculateSimilarity(current, past) {
    const weatherDist = Math.sqrt(
        Math.pow((current.humidity - past.humidity) / 40, 2) +
        Math.pow((current.windSpeed - past.wind_speed) / 10, 2) +
        Math.pow((current.temperature - past.temperature) / 20, 2)
    );
    const weatherScore = Math.exp(-weatherDist);
    let envScore = 0;
    if (current.imsangdo_frtp_cd === past.imsangdo_frtp_cd) envScore += 0.5;
    if (current.soil_tpgrp_tpcd === past.soil_tpgrp_tpcd) envScore += 0.5;
    return (weatherScore * 0.7) + (envScore * 0.3);
}

function findSimilarPastFire(ignitionPoint, weatherData) {
    if (historicalFireStarts.length === 0) return null;
    let bestMatch = { event: null, score: 0 };
    const currentFire = {
        ...ignitionPoint,
        humidity: weatherData.hm2m,
        windSpeed: weatherData.ws2m,
        temperature: weatherData.tm2m,
    };
    for (const pastFire of historicalFireStarts) {
        const score = calculateSimilarity(currentFire, pastFire);
        if (score > bestMatch.score) {
            bestMatch = { event: pastFire, score };
        }
    }
    console.log(`[유사도 검사] 최고 점수: ${bestMatch.score.toFixed(2)} (사례: ${bestMatch.event.event_id}, 등급: ${bestMatch.event.fire_class})`);
    if (bestMatch.score > SIMILARITY_THRESHOLD) {
        return bestMatch.event;
    }
    return null;
}

const getFuelScore = (imsangdoCode) => imsangdoCode ? ({ '1': 5, '3': 4, '2': 3, '4': 2 }[imsangdoCode] ?? 0) : 0;
const getSlopeFactor = (code1) => {
    if (!code1) return 1.0;
    return { '01': 1.5, '02': 1.5, '03': 1.5, '08': 1.5, '12': 1.5, '04': 0.8, '05': 0.8, '06': 0.8, '07': 0.8, '11': 0.8, '10': 0.5 }[code1] ?? 1.0;
};
const getBurnoutDuration = (fuelScore, humidity, distance = 0) => {
    let baseDuration = fuelScore * 3600 * 2;
    if (humidity > 80) baseDuration *= 0.5; else if (humidity > 70) baseDuration *= 0.7;
    const jumpUnits = distance / 1.2;
    if (jumpUnits >= 2) {
        const distancePenaltyFactor = Math.max(1, jumpUnits - 1);
        baseDuration /= distancePenaltyFactor;
    }
    return baseDuration;
};

function calculateRuleBasedROS(neighbor, weather, bearing) {
    const fuelScore = getFuelScore(neighbor.imsangdo_frtp_cd);
    if (fuelScore === 0) return 0;
    const slopeFactor = getSlopeFactor(neighbor.soil_tpgrp_tpcd);
    const terrainEffect = fuelScore * slopeFactor;
    const { hm2m: humidity, ws2m: windSpeed, wd2m: windDirection } = weather;
    const moistureEffect = 1.0 + (50 - humidity) / 50.0;
    const angleDiff = Math.abs((windDirection - bearing + 180) % 360 - 180);
    let windEffect = windSpeed * 0.5;
    if (angleDiff < 45) windEffect *= 1.5;
    else if (angleDiff > 135) windEffect *= 0.5;
    const finalROS = terrainEffect * (0.2 + Math.max(0, moistureEffect) + Math.max(0, windEffect));
    return Math.max(0, finalROS);
}

const findNeighbors = (currentPoint, allPoints) => {
    const searchRadius = 0.03;
    const [lon, lat] = currentPoint.coordinates;
    const candidates = allPoints
        .filter(p => p.id !== currentPoint.id && p.lat > lat - searchRadius && p.lat < lat + searchRadius && p.lng > lon - searchRadius && p.lng < lon + searchRadius)
        .map(p => ({ point: p, dist: turf.distance(currentPoint.coordinates, p.coordinates) }))
        .filter(item => item.dist > 0 && item.dist < 5.0)
        .sort((a, b) => a.dist - b.dist);
    return candidates.slice(0, 8).map(item => item.point.id);
};

async function runGenerativeSimulation(ignitionPoint, allPoints, pointMap, weatherData, scenario, scenarioSource) {
    console.log(`[시나리오 설정] ${scenarioSource} 기반 예측 등급: ${scenario.name}`);
    console.log(` -> 적용 규칙: 최대 셀 ${scenario.MAX_IGNITED_CELLS}개, 최대 속도 ${scenario.MAX_ROS}`);
    
    const { hm2m: humidity, ws2m: windSpeed, wd2m: windDirection, tm2m: temperature, rn: precipitation } = weatherData;
    const ignition_id = ignitionPoint.id;

    const simulationStartTime = new Date();
    const simResults = new Map();
    allPoints.forEach(p => simResults.set(p.id, { ignitionTime: null, burnoutTime: null }));
    const eventQueue = new TinyQueue([], (a, b) => a.priority - b.priority);
    
    const initialResult = simResults.get(ignition_id);
    initialResult.ignitionTime = 0;
    eventQueue.push({ element: ignition_id, priority: 0 });

    while (eventQueue.length > 0) {
        const currentTotalIgnited = Array.from(simResults.values()).filter(r => r.ignitionTime !== null).length;
        if (currentTotalIgnited >= scenario.MAX_IGNITED_CELLS) {
            console.log(`[시나리오 종료] 최대 발화 셀 개수(${scenario.MAX_IGNITED_CELLS})에 도달하여 시뮬레이션을 종료합니다.`);
            break;
        }
        const currentPointId = eventQueue.pop().element;
        const currentPoint = pointMap.get(currentPointId);
        const currentResult = simResults.get(currentPointId);

        if (currentResult.ignitionTime > 24 * 3600) continue;

        const neighborIds = findNeighbors(currentPoint, allPoints);

        for (const neighborId of neighborIds) {
            const neighbor = pointMap.get(neighborId);
            if (simResults.get(neighborId).ignitionTime != null) continue;

            const distance = turf.distance(currentPoint.coordinates, neighbor.coordinates);
            const bearing = turf.bearing(currentPoint.coordinates, neighbor.coordinates);
            if (distance > 1.5 && windSpeed < 10) continue;
            
            const ruleBasedROS = calculateRuleBasedROS(neighbor, weatherData, bearing);
            
            const simElapsedTime = currentResult.ignitionTime;
            const simCurrentTime = new Date(simulationStartTime.getTime() + simElapsedTime * 1000);
            const currentHour = simCurrentTime.getHours();
            const isDay = currentHour >= 7 && currentHour < 19;
            const daynightValue = isDay ? 1 : 0;
            const fuelScore = getFuelScore(neighbor.imsangdo_frtp_cd);
            const frpValue = 10 + (fuelScore * 20) + (Math.random() * 20);

            const slopeFactor = getSlopeFactor(neighbor.soil_tpgrp_tpcd);
            const distance_to_station_km = turf.distance(currentPoint.coordinates, [weatherData.longitude, weatherData.latitude]);
            
            const wind_fuel_interaction = windSpeed * fuelScore;
            const aridity_index = temperature / (humidity + 1);
            const terrain_difficulty = slopeFactor * distance_to_station_km;

            const featuresForDNN = {
                latitude: neighbor.lat, longitude: neighbor.lng, acq_time: currentHour * 100,
                satellite: 1, instrument: 1, confidence: 95, frp: frpValue,
                daynight: daynightValue, type: 0.0,
                distance_to_station_km: distance_to_station_km,
                nearest_station_id: weatherData.obsid, temperature: temperature, precipitation: precipitation, 
                wind_speed: windSpeed, wind_direction: windDirection, humidity: humidity, 
                grid_id: neighbor.id, imsangdo_frtp_cd: neighbor.imsangdo_frtp_cd,
                imsangdo_dmcls_cd: neighbor.imsangdo_dmcls_cd, imsangdo_agcls_cd: neighbor.imsangdo_agcls_cd,
                imsangdo_dnst_cd: parseFloat(neighbor.imsangdo_dnst_cd), 
                soil_loctn_altt: neighbor.soil_loctn_altt, soil_loctn_grdn: neighbor.soil_loctn_grdn, 
                soil_tpgrp_tpcd: neighbor.soil_tpgrp_tpcd, soil_sltp_cd: neighbor.soil_sltp_cd,
                wind_fuel_interaction: wind_fuel_interaction, aridity_index: aridity_index,
                terrain_difficulty: terrain_difficulty
            };
            
            const dnnCorrectionFactor_raw = await getPredictionFromDNN(featuresForDNN);
            const dnnCorrectionFactor = Math.max(DNN_FACTOR_MIN, Math.min(dnnCorrectionFactor_raw, DNN_FACTOR_MAX));
            const hybridRosScore = ruleBasedROS * dnnCorrectionFactor;
            
            let spreadBrake = 1.0;
            if (currentTotalIgnited > 150) spreadBrake = 0.2;
            else if (currentTotalIgnited > 80) spreadBrake = 0.5;
            
            const finalRos = Math.min(hybridRosScore * spreadBrake, scenario.MAX_ROS) * REALISM_FACTOR;

            if (finalRos < MINIMUM_ROS_TO_SPREAD) continue;

            const timeToTravel = (distance * 3600) / finalRos;
            const newIgnitionTime = currentResult.ignitionTime + timeToTravel;

            if (newIgnitionTime < (simResults.get(neighborId).ignitionTime ?? Infinity)) {
                simResults.get(neighborId).ignitionTime = newIgnitionTime;
                eventQueue.push({ element: neighborId, priority: newIgnitionTime });
            }
        }
    }
    
    const durationFactor = scenario.DURATION_FACTOR;
    const MINIMUM_BURNING_SECONDS = 600;

    simResults.forEach((result, id) => {
        if (result.ignitionTime !== null) {
            const point = pointMap.get(id);
            const fuelScore = getFuelScore(point.imsangdo_frtp_cd);
            const adjustedDuration = getBurnoutDuration(fuelScore, humidity, 0) * durationFactor;
            result.burnoutTime = result.ignitionTime + Math.max(adjustedDuration, MINIMUM_BURNING_SECONDS);
        }
    });

    const ignitedFeatures = allPoints.filter(p => simResults.get(p.id).ignitionTime !== null)
        .map(p => ({
            type: 'Feature', 
            geometry: { type: 'Point', coordinates: p.coordinates },
            properties: { id: p.id, ...simResults.get(p.id) }
        }));
    
    const timeBoundaries = [];
    const timeStep = 600;
    const maxIgnitionTime = ignitedFeatures.reduce((max, f) => Math.max(max, f.properties.ignitionTime || 0), 0);
    
    for (let t = 0; t <= maxIgnitionTime + timeStep; t += timeStep) {
        const pointsIgnitedByTimeT = ignitedFeatures.filter(f => f.properties.ignitionTime !== null && f.properties.ignitionTime <= t);
        if (pointsIgnitedByTimeT.length >= 3) {
            const pointsForHull = turf.featureCollection(pointsIgnitedByTimeT.map(f => turf.point(f.geometry.coordinates)));
            const hull = turf.convex(pointsForHull);
            if (hull) timeBoundaries.push({ time: t, polygon: hull });
        }
    }

    const simulationEndTime = ignitedFeatures.reduce((max, f) => Math.max(max, f.properties.burnoutTime || 0), 0);

    return { features: ignitedFeatures, timeBoundaries, simulationEndTime };
}

const runFireSpreadPrediction = async (pool, ignition_id) => {
    const cacheKey = `prediction-${ignition_id}`;
    if (simulationCache.has(cacheKey)) {
        console.log(`[Cache] 캐시된 결과 반환 (ignition_id: ${ignition_id})`);
        return simulationCache.get(cacheKey);
    }
    
    if (historicalFireStarts.length === 0) {
        await loadHistoricalFireStarts();
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(`SELECT id, lat, lng, imsangdo_frtp_cd, imsangdo_dmcls_cd, imsangdo_agcls_cd, imsangdo_dnst_cd, soil_loctn_altt, soil_loctn_grdn, soil_tpgrp_tpcd, soil_sltp_cd FROM ${KOREA_GRID_TABLE}`);
        const allPoints = rows.map(row => ({ ...row, coordinates: [parseFloat(row.lng), parseFloat(row.lat)] }));
        const pointMap = new Map(allPoints.map(p => [p.id, p]));
        const ignitionPoint = pointMap.get(ignition_id);

        if (!ignitionPoint) throw new Error('발화점 데이터를 찾을 수 없습니다.');
        
        const nearestStation = mountainStationsData.reduce((p, c) => (turf.distance(ignitionPoint.coordinates, [c.longitude, c.latitude]) < turf.distance(ignitionPoint.coordinates, [p.longitude, p.latitude]) ? c : p));
        const weatherRef = db.ref(`weatherdata/${nearestStation.obsid}`);
        const snapshot = await weatherRef.once('value');
        const weatherData = snapshot.val() || { tm2m: 20, hm2m: 50, ws2m: 3, wd2m: 270, rn: 0 };
        weatherData.obsid = nearestStation.obsid;
        weatherData.latitude = nearestStation.latitude;
        weatherData.longitude = nearestStation.longitude;

        let scenario;
        let scenarioSource = "";
        
        const similarEvent = findSimilarPastFire(ignitionPoint, weatherData);

        if (similarEvent) {
            scenarioSource = `유사사례(${similarEvent.event_id})`;
            scenario = { name: similarEvent.fire_class, ...SIMULATION_SCENARIOS[similarEvent.fire_class] };
        } else {
            scenarioSource = "DNN 사전분류";
            
            const fuelScore = getFuelScore(ignitionPoint.imsangdo_frtp_cd);
            const slopeFactor = getSlopeFactor(ignitionPoint.soil_tpgrp_tpcd);
            const wind_fuel_interaction = (weatherData.ws2m || 0) * fuelScore;
            const aridity_index = (weatherData.tm2m || 0) / ((weatherData.hm2m || 50) + 1);
            const terrain_difficulty = slopeFactor * 0;

            const initialFeatures = {
                latitude: ignitionPoint.lat, longitude: ignitionPoint.lng, acq_time: new Date().getHours() * 100,
                satellite: 1, instrument: 1, confidence: 95, frp: 50.0,
                daynight: (new Date().getHours() >= 7 && new Date().getHours() < 19) ? 1 : 0,
                type: 0.0, distance_to_station_km: 0,
                nearest_station_id: weatherData.obsid || 0,
                temperature: weatherData.tm2m, precipitation: weatherData.rn,
                wind_speed: weatherData.ws2m, wind_direction: weatherData.wd2m, humidity: weatherData.hm2m,
                grid_id: ignition_id, imsangdo_frtp_cd: ignitionPoint.imsangdo_frtp_cd,
                imsangdo_dmcls_cd: ignitionPoint.imsangdo_dmcls_cd, imsangdo_agcls_cd: ignitionPoint.imsangdo_agcls_cd,
                imsangdo_dnst_cd: parseFloat(ignitionPoint.imsangdo_dnst_cd),
                soil_loctn_altt: ignitionPoint.soil_loctn_altt, soil_loctn_grdn: ignitionPoint.soil_loctn_grdn,
                soil_tpgrp_tpcd: ignitionPoint.soil_tpgrp_tpcd, soil_sltp_cd: ignitionPoint.soil_sltp_cd,
                wind_fuel_interaction: wind_fuel_interaction, aridity_index: aridity_index,
                terrain_difficulty: terrain_difficulty,
            };
            const classificationResult = await preClassifyFire(initialFeatures);
            scenario = { name: classificationResult.predicted_fire_class, ...SIMULATION_SCENARIOS[classificationResult.predicted_fire_class] };
        }

        const result = await runGenerativeSimulation(ignitionPoint, allPoints, pointMap, weatherData, scenario, scenarioSource);

        const finalResult = {
            ...result,
            scenarioName: scenario.name,
            
            stationInfo: {
                obsid: nearestStation.obsid,
                name: nearestStation.name,
                latitude: nearestStation.latitude,
                longitude: nearestStation.longitude
            }
        };

        if (finalResult) {
            simulationCache.set(cacheKey, finalResult);
        }
        return finalResult;

    } finally {
        if (connection) connection.release();
    }
};

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

const getGridWithFuelInfo = async (pool) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const sql = `
            SELECT t1.id, t1.lat, t1.lng, t2.fuel_score 
            FROM imported_fire_data_auto AS t1
            JOIN grid_fuel_ratings AS t2 ON t1.id = t2.grid_id
        `;
        const [rows] = await connection.query(sql);
        return rows;
    } finally {
        if (connection) connection.release();
    }
};

// getHistoricalFires 함수 (CSV 소스 버전)
const getHistoricalFires = async () => {
    if (historicalFireStarts.length === 0) {
        await loadHistoricalFireStarts();
    }

    const firesById = {};
    for (const row of historicalFireStarts) {
        if (!row.event_id) continue;

        if (!firesById[row.event_id]) {
            firesById[row.event_id] = {
                id: row.event_id,
                rows: [],
                timestamps: new Set(),
            };
        }

        const formattedTime = String(row.acq_time).padStart(4, '0');
        const timestamp = new Date(`${row.acq_date}T${formattedTime.slice(0, 2)}:${formattedTime.slice(2, 4)}:00Z`).getTime();

        row.timestamp = timestamp;
        firesById[row.event_id].timestamps.add(timestamp);
        firesById[row.event_id].rows.push(row);
    }

    const processedFires = [];
    const SYNTHETIC_SPREAD_RATE_SECS_PER_KM = 1800; 

    for (const eventId in firesById) {
        const fireEvent = firesById[eventId];
        const firstRow = fireEvent.rows[0];
        const mappedName = firstRow.mapped_fire_name;

        if (mappedName && String(mappedName).trim() !== '') {
            const title = mappedName;
            let features;
            const uniqueTimestampsCount = fireEvent.timestamps.size;

            if (uniqueTimestampsCount <= 1 && fireEvent.rows.length > 1) {
                console.log(`[가상 애니메이션] ${eventId}: 타임스탬프가 동일하여 거리에 기반한 애니메이션을 생성합니다.`);
                const startPoint = turf.point([parseFloat(firstRow.longitude), parseFloat(firstRow.latitude)]);
                features = fireEvent.rows.map(row => {
                    const currentPoint = turf.point([parseFloat(row.longitude), parseFloat(row.latitude)]);
                    const distanceKm = turf.distance(startPoint, currentPoint);
                    const ignitionTime = distanceKm * SYNTHETIC_SPREAD_RATE_SECS_PER_KM;
                    const burnoutTime = ignitionTime + 3600;
                    return { type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)] }, properties: { id: row.grid_id, ignitionTime, burnoutTime, isConnectingLine: false } };
                });
            } else {
                const minTimestamp = Math.min(...fireEvent.timestamps);
                features = fireEvent.rows.map(row => {
                    const ignitionTime = (row.timestamp - minTimestamp) / 1000;
                    const burnoutTime = ignitionTime + 3600;
                    return { type: 'Feature', geometry: { type: 'Point', coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)] }, properties: { id: row.grid_id, ignitionTime, burnoutTime, isConnectingLine: false } };
                });
            }

            features.sort((a, b) => a.properties.ignitionTime - b.properties.ignitionTime);

            if (features.length > 1) {
                const startPointCoords = features[0].geometry.coordinates;
                const endPointCoords = features[features.length - 1].geometry.coordinates;
                features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [startPointCoords, endPointCoords] }, properties: { isConnectingLine: true } });
            }

            const simulationEndTime = features.filter(f => f.geometry.type === 'Point').reduce((max, f) => Math.max(max, f.properties.burnoutTime || 0), 0);
            const scenarioName = firstRow.fire_class || '알수없음';
            processedFires.push({ id: eventId, title: title, simulationData: { features, timeBoundaries: [], simulationEndTime, scenarioName } });
        }
    }
    return processedFires;
};


module.exports = { 
    runFireSpreadPrediction, 
    getGridData, 
    getGridWithFuelInfo, 
    loadHistoricalFireStarts,
    getHistoricalFires,
    //reloadHistoricalFireStarts // 이 부분을 추가합니다.
};
