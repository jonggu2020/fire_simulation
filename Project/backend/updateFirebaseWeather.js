// updateFirebaseWeather.js

console.log("--- 스크립트 실행 시작 ---");
console.log("현재 시간:", new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }));

// 0. dotenv 설정: 환경 변수를 .env 파일에서 로드합니다.
require('dotenv').config();

// 1. 필요한 도구들 가져오기
const admin = require('firebase-admin');
const axios = require('axios');
const { mountainStationsData } = require('./mountainStations'); // 이 파일은 그대로 둡니다.

console.log("필요한 모듈 로드 완료.");

if (!mountainStationsData || mountainStationsData.length === 0) {
    console.error("!!! mountainStationsData가 비어있거나 로드되지 않았습니다. 스크립트를 종료합니다.");
    process.exit(1);
}
console.log(`총 ${mountainStationsData.length}개의 관측소 데이터 로드됨.`);


// 2. Firebase Admin SDK 초기화 (환경 변수 사용)
const rtdbServiceAccountStr = process.env.RTDB_SERVICE_ACCOUNT_JSON;
if (!rtdbServiceAccountStr) {
    throw new Error('RTDB_SERVICE_ACCOUNT_JSON 환경 변수를 찾을 수 없습니다. .env 파일을 확인하세요.');
}
const serviceAccount = JSON.parse(rtdbServiceAccountStr);

const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
if (!FIREBASE_DATABASE_URL) {
    throw new Error('FIREBASE_DATABASE_URL 환경 변수를 찾을 수 없습니다. .env 파일을 확인하세요.');
}

try {
    console.log("Firebase Admin SDK 초기화 시도...");
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: FIREBASE_DATABASE_URL
        });
        console.log("Firebase Admin SDK 신규 초기화 성공.");
    } else {
        console.log("Firebase Admin SDK가 이미 초기화되어 있습니다.");
    }
} catch (e) {
    console.error("!!! Firebase Admin SDK 초기화 실패:", e);
    process.exit(1);
}

const db = admin.database();
console.log("Firebase Realtime Database 인스턴스 가져오기 완료.");


// 3. 기상청 API 관련 정보 설정 (환경 변수 사용)
const KMA_API_KEY = process.env.KMA_API_KEY;
if (!KMA_API_KEY) {
    throw new Error('KMA_API_KEY 환경 변수를 찾을 수 없습니다. .env 파일을 확인하세요.');
}
const KMA_WEATHER_API_URL = 'http://apis.data.go.kr/1400377/mtweather/mountListSearch';
console.log("기상청 API 설정 완료.");


// (이하 나머지 코드는 이전과 동일하게 유지됩니다)
// ... fetchKmaWeatherData 함수 ...
// ... updateAllStationsWeather 함수 ...
// ... runUpdateCycle 함수 및 setInterval ...

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
        console.log(`   [기상청 API] obsid: ${obsid}, 시간: ${requestTm} 날씨 정보 요청 중...`);
        const response = await axios.get(KMA_WEATHER_API_URL + queryParams, { timeout: 15000 });

        if (response.data?.response?.header?.resultCode === "00") {
            const items = response.data.response.body?.items?.item;
            if (items) {
                const weatherData = Array.isArray(items) ? items[0] : items;
                console.log(`   [기상청 API] obsid: ${obsid} 정보 가져오기 성공.`);
                return weatherData;
            } else {
                console.warn(`   [기상청 API] obsid: ${obsid}에 대한 날씨 항목(item)을 찾을 수 없음. 응답 코드: 00.`);
                return null;
            }
        } else {
            const errorCode = response.data?.response?.header?.resultCode || 'N/A';
            const errorMsg = response.data?.response?.header?.resultMsg || '알 수 없는 API 오류';
            console.error(`   [기상청 API] obsid: ${obsid} API 오류 발생. 코드: ${errorCode}, 메시지: ${errorMsg}`);
            return null;
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`   [기상청 API] obsid: ${obsid} 요청 시간 초과(Timeout).`);
        } else if (error.response) {
            console.error(`   [기상청 API] obsid: ${obsid} HTTP 오류: ${error.response.status}`, error.response.data);
        } else {
            console.error(`   [기상청 API] obsid: ${obsid} 네트워크 또는 기타 오류:`, error.message);
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
            console.warn(`[데이터 오류] ${i+1}번째 관측소 데이터에 obsid가 없습니다. 건너뜁니다.`);
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
                console.log(`   [Firebase 업데이트] obsid: ${obsid} (${stationName}) 정보를 Firebase에 성공적으로 업데이트했습니다.`);
                successCount++;
            } catch (firebaseError) {
                console.error(`   [Firebase 업데이트] obsid: ${obsid} (${stationName}) 정보를 Firebase에 쓰는 중 오류 발생:`, firebaseError.message);
                errorCount++;
            }
        } else {
            console.log(`   [Firebase 업데이트] obsid: ${obsid} (${stationName})의 KMA 날씨 정보가 없어 업데이트를 건너뜁니다.`);
            noDataFromKmaCount++;
        }

        if (i < mountainStationsData.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 250)); // 0.25초 대기
        }
    }

    console.log(`\n[Firebase 업데이트] 날씨 정보 업데이트 작업 요약 (${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}):`);
    console.log(`   성공: ${successCount} 건`);
    console.log(`   KMA 데이터 없음/건너뜀: ${noDataFromKmaCount} 건`);
    console.log(`   Firebase 저장 또는 기타 오류: ${errorCount} 건`);
}

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1시간

async function runUpdateCycle() {
    console.log(`\n[스케줄러] ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} - 다음 업데이트 주기 실행...`);
    try {
        await updateAllStationsWeather();
    } catch (error) {
        console.error('[스케줄러] updateAllStationsWeather 함수 실행 중 예기치 않은 오류 발생:', error);
    }
}

console.log(`[메인] 산악 기상 정보 자동 업데이트 스크립트가 시작되었습니다.`);
console.log(`[메인] ${UPDATE_INTERVAL_MS / (60 * 1000)}분 간격으로 날씨 정보를 업데이트합니다.`);

runUpdateCycle();
setInterval(runUpdateCycle, UPDATE_INTERVAL_MS);

console.log("[메인] 스크립트가 백그라운드에서 계속 실행됩니다.");