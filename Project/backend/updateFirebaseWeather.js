// updateFirebaseWeather.js

console.log("--- 스크립트 실행 시작 ---");
console.log("현재 시간:", new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }));

// 1. 필요한 도구들 가져오기
const admin = require('firebase-admin');
const axios = require('axios');

console.log("필요한 모듈(firebase-admin, axios) 로드 완료.");

// mountainStations.js 로드 시도 및 데이터 확인
let mountainStationsData;
const MOUNTAIN_STATIONS_PATH = './mountainStations.js'; // 파일 경로를 변수로 명시
try {
    console.log(`'${MOUNTAIN_STATIONS_PATH}' 파일 로드 시도...`);
    const stationsModule = require(MOUNTAIN_STATIONS_PATH);
    mountainStationsData = stationsModule.mountainStationsData;

    if (mountainStationsData && typeof mountainStationsData === 'object' && !Array.isArray(mountainStationsData) && Object.keys(mountainStationsData).length === 0 && mountainStationsData.constructor === Object) {
        mountainStationsData = stationsModule;
    }

    if (!mountainStationsData) {
        throw new Error("stationsModule.mountainStationsData is undefined. Check export structure.");
    }

    console.log(`'${MOUNTAIN_STATIONS_PATH}' 파일 로드 성공.`);
    if (Array.isArray(mountainStationsData)) {
        console.log("로드된 mountainStationsData (샘플 처음 2개):", mountainStationsData.slice(0, 2));
        console.log(`총 ${mountainStationsData.length}개의 관측소 데이터 로드됨.`);
    } else {
        console.error("!!! mountainStationsData가 배열이 아닙니다. 파일 내용을 확인해주세요.", typeof mountainStationsData);
        throw new Error("mountainStationsData is not an array.");
    }

} catch (e) {
    console.error(`!!! '${MOUNTAIN_STATIONS_PATH}' 파일 로드 실패:`, e.message);
    console.error("스크립트를 종료합니다. mountainStations.js 파일이 현재 폴더에 있고, 내용 및 CommonJS export 방식(module.exports = { mountainStationsData }; 또는 module.exports = [...] 직접 할당)이 올바른지 확인해주세요.");
    process.exit(1);
}

if (!mountainStationsData || mountainStationsData.length === 0) {
    console.error("!!! mountainStationsData가 비어있거나 정의되지 않았습니다.");
    console.error("mountainStations.js 파일에 실제 관측소 데이터가 들어있는지, 그리고 module.exports로 올바르게 내보내고 있는지 확인해주세요.");
    process.exit(1);
}

// 2. Firebase Admin SDK 초기화
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
let serviceAccount;
try {
    console.log(`서비스 계정 키 파일 ('${SERVICE_ACCOUNT_PATH}') 로드 시도...`);
    serviceAccount = require(SERVICE_ACCOUNT_PATH);
    console.log("서비스 계정 키 파일 로드 성공.");
} catch (e) {
    console.error(`!!! 서비스 계정 키 파일 ('${SERVICE_ACCOUNT_PATH}') 로드 실패:`, e.message);
    console.error("스크립트를 종료합니다. 파일 경로와 파일 내용(올바른 JSON 형식)이 올바른지 확인해주세요.");
    process.exit(1);
}

const FIREBASE_DATABASE_URL = 'https://ljg2020315018-default-rtdb.firebaseio.com';
console.log(`Firebase Database URL: ${FIREBASE_DATABASE_URL}`);

try {
    console.log("Firebase Admin SDK 초기화 시도...");
    if (admin.apps.length === 0) { // 이미 초기화되지 않았을 경우에만 초기화
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: FIREBASE_DATABASE_URL
        });
        console.log("Firebase Admin SDK 신규 초기화 성공.");
    } else {
        console.log("Firebase Admin SDK가 이미 초기화되어 있습니다. 기존 인스턴스를 사용합니다.");
    }
} catch (e) {
    console.error("!!! Firebase Admin SDK 초기화 실패:", e);
    console.error("서비스 계정 키 또는 Database URL이 올바른지 확인해주세요.");
    process.exit(1);
}

const db = admin.database();
console.log("Firebase Realtime Database 인스턴스 가져오기 완료.");

// 3. 기상청 API 관련 정보 설정
const KMA_API_KEY = 'q1XWOAcb5VskyP5OQGl%2B08hLR9MyROzs%2Fav5AbVDjLpvMEbcl4qlFU%2BxSf6oxNDm2XGu0ljXk6cjUocIPX7N8Q%3D%3D'; // 실제 키를 사용하세요
const KMA_WEATHER_API_URL = 'http://apis.data.go.kr/1400377/mtweather/mountListSearch';
console.log("기상청 API 설정 완료.");

/**
 * 함수 설명: 특정 관측소의 날씨 정보를 기상청 API로부터 가져옵니다.
 * @param {string} obsid - 관측 지점 번호 (예: '1890')
 * @param {string} requestTm - 요청 시간 (예: '202505152100' -> 2025년 5월 15일 21시 00분)
 * @returns {Promise<object|null>} 날씨 데이터 객체를 반환하거나, 실패 시 null 반환
 */
async function fetchKmaWeatherData(obsid, requestTm) {
    let queryParams = `?serviceKey=${KMA_API_KEY}`;
    queryParams += `&pageNo=1`;
    queryParams += `&numOfRows=1`;
    queryParams += `&_type=json`;
    queryParams += `&obsid=${encodeURIComponent(obsid)}`;
    queryParams += `&tm=${encodeURIComponent(requestTm)}`;

    try {
        console.log(`  [기상청 API] obsid: ${obsid}, 시간: ${requestTm} 날씨 정보 요청 중...`);
        const response = await axios.get(KMA_WEATHER_API_URL + queryParams, { timeout: 15000 });

        if (response.data?.response?.header?.resultCode === "00") {
            const items = response.data.response.body?.items?.item;
            if (items) {
                const weatherData = Array.isArray(items) ? items[0] : items;
                console.log(`  [기상청 API] obsid: ${obsid} 정보 가져오기 성공.`);
                return weatherData;
            } else {
                console.warn(`  [기상청 API] obsid: ${obsid}에 대한 날씨 항목(item)을 찾을 수 없음. 응답 코드: 00. 응답 본문:`, JSON.stringify(response.data.response.body, null, 2));
                return null;
            }
        } else {
            const errorCode = response.data?.response?.header?.resultCode || 'N/A';
            const errorMsg = response.data?.response?.header?.resultMsg || '알 수 없는 API 오류';
            console.error(`  [기상청 API] obsid: ${obsid} API 오류 발생. 코드: ${errorCode}, 메시지: ${errorMsg}`);
            return null;
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`  [기상청 API] obsid: ${obsid} 요청 시간 초과(Timeout).`);
        } else if (error.response) {
            console.error(`  [기상청 API] obsid: ${obsid} HTTP 오류: ${error.response.status}`, error.response.data);
        } else {
            console.error(`  [기상청 API] obsid: ${obsid} 네트워크 또는 기타 오류:`, error.message);
        }
        return null;
    }
}

/**
 * 함수 설명: 모든 관측소의 최신 날씨 정보를 가져와 Firebase에 업데이트합니다.
 */
async function updateAllStationsWeather() {
    console.log('\n[Firebase 업데이트] 주기적 날씨 정보 업데이트 작업을 시작합니다...');
    const now = new Date();
    // KMA API는 보통 현재 시간 또는 약간 이전 시간의 정시 데이터를 제공합니다.
    // 요청 시간을 현재 시간의 정시로 설정합니다. (예: 21:30 -> 21:00 요청)
    now.setMinutes(0, 0, 0);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const requestTm = `${year}${month}${day}${hours}00`;

    console.log(`[기준 시간] 모든 관측소에 대해 ${requestTm} 시간의 날씨 정보를 요청합니다.`);

    let successCount = 0;
    let errorCount = 0;
    let noDataFromKmaCount = 0;

    for (let i = 0; i < mountainStationsData.length; i++) {
        const station = mountainStationsData[i];
        if (!station || typeof station.obsid === 'undefined') {
            console.warn(`[데이터 오류] ${i+1}번째 관측소 데이터에 obsid가 없습니다. 건너뜁니다. 데이터:`, station);
            errorCount++;
            continue;
        }
        const obsid = String(station.obsid);
        const stationName = station.name || `ID-${obsid}`;

        console.log(`\n[${i+1}/${mountainStationsData.length}] 관측소: ${stationName} (obsid: ${obsid}) 작업 시작...`);
        const weatherData = await fetchKmaWeatherData(obsid, requestTm);

        if (weatherData) {
            try {
                const firebasePath = `weatherdata/${obsid}`;
                await db.ref(firebasePath).set(weatherData);
                console.log(`  [Firebase 업데이트] obsid: ${obsid} (${stationName}) 정보를 Firebase 경로 '${firebasePath}'에 성공적으로 업데이트했습니다.`);
                successCount++;
            } catch (firebaseError) {
                console.error(`  [Firebase 업데이트] obsid: ${obsid} (${stationName}) 정보를 Firebase에 쓰는 중 오류 발생:`, firebaseError.message);
                errorCount++;
            }
        } else {
            console.log(`  [Firebase 업데이트] obsid: ${obsid} (${stationName})의 KMA 날씨 정보가 없어 Firebase 업데이트를 건너뜁니다.`);
            noDataFromKmaCount++;
        }

        // 연속적인 API 요청에 대한 부담을 줄이기 위해 각 요청 사이에 짧은 지연 시간(딜레이)을 둡니다. (선택 사항)
        // 기상청 API 정책에 따라 초당 요청 제한 등이 있을 수 있으므로, 필요시 조절합니다.
        if (i < mountainStationsData.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 250)); // 0.25초 대기
        }
    }

    console.log(`\n[Firebase 업데이트] 날씨 정보 업데이트 작업 요약 (${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}):`);
    console.log(`  성공: ${successCount} 건`);
    console.log(`  KMA 데이터 없음/건너뜀: ${noDataFromKmaCount} 건`);
    console.log(`  Firebase 저장 또는 기타 오류: ${errorCount} 건`);
}

// --- 주기적 실행 설정 ---
const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1시간 (밀리초 단위)

/**
 * 업데이트 주기를 실행하고 다음 실행을 예약하는 함수
 */
async function runUpdateCycle() {
    console.log(`\n[스케줄러] ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} - 다음 업데이트 주기 실행...`);
    try {
        await updateAllStationsWeather();
    } catch (error) {
        // updateAllStationsWeather 내부에서 대부분의 오류를 처리하지만,
        // 예기치 못한 오류로 인해 Promise가 reject될 경우를 대비하여 로깅
        console.error('[스케줄러] updateAllStationsWeather 함수 실행 중 예기치 않은 오류 발생:', error);
    }
}

// 스크립트 메인 로직
console.log(`[메인] ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} - 산악 기상 정보 자동 업데이트 스크립트가 시작되었습니다.`);
console.log(`[메인] ${UPDATE_INTERVAL_MS / (60 * 1000)}분 (${UPDATE_INTERVAL_MS / (60*60*1000)}시간) 간격으로 날씨 정보를 가져와 Firebase에 업데이트합니다.`);

// 1. 스크립트 시작 시 즉시 1회 실행
runUpdateCycle();

// 2. 이후 설정된 간격으로 주기적 실행
setInterval(runUpdateCycle, UPDATE_INTERVAL_MS);

// 스크립트가 종료되지 않고 계속 실행되도록 유지
// (setInterval이 Node.js 프로세스를 활성 상태로 유지합니다)
console.log("[메인] 스크립트가 백그라운드에서 계속 실행됩니다. 종료하려면 Ctrl+C를 누르세요.");