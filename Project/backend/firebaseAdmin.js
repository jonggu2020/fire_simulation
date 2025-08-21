// backend/firebaseAdmin.js

const admin = require('firebase-admin');
// .env 파일을 로드하기 위해 최상단에 추가
require('dotenv').config();

// --- 1. Firestore, Auth, Storage용 앱 초기화 ---

// .env 파일에서 Firestore 서비스 계정 JSON "내용"을 직접 가져옵니다.
const firestoreServiceAccountStr = process.env.FIRESTORE_SERVICE_ACCOUNT_JSON;
if (!firestoreServiceAccountStr) {
    throw new Error('FIRESTORE_SERVICE_ACCOUNT_JSON 환경 변수를 찾을 수 없습니다. .env 파일을 확인하세요.');
}
const firestoreServiceAccount = JSON.parse(firestoreServiceAccountStr);

// 앱에 고유한 이름을 부여하여 다른 앱과 구별합니다.
const firestoreApp = admin.initializeApp({
  credential: admin.credential.cert(firestoreServiceAccount),
}, 'firestoreApp');


// --- 2. Realtime Database용 앱 초기화 ---

// .env 파일에서 RTDB 서비스 계정 JSON "내용"과 DB URL을 직접 가져옵니다.
const rtdbServiceAccountStr = process.env.RTDB_SERVICE_ACCOUNT_JSON;
if (!rtdbServiceAccountStr) {
    throw new Error('RTDB_SERVICE_ACCOUNT_JSON 환경 변수를 찾을 수 없습니다. .env 파일을 확인하세요.');
}
const rtdbServiceAccount = JSON.parse(rtdbServiceAccountStr);

const databaseURL = process.env.FIREBASE_DATABASE_URL;
if (!databaseURL) {
    throw new Error('FIREBASE_DATABASE_URL 환경 변수를 찾을 수 없습니다. .env 파일을 확인하세요.');
}

// 앱에 고유한 이름을 부여하여 다른 앱과 구별합니다.
const rtdbApp = admin.initializeApp({
  credential: admin.credential.cert(rtdbServiceAccount),
  databaseURL: databaseURL
}, 'rtdbApp');


// --- 각 서비스에 맞는 앱 인스턴스에서 기능을 가져옵니다 ---
const db = rtdbApp.database(); // Realtime Database는 'rtdbApp'에서 가져옵니다.
const firestoreDb = firestoreApp.firestore(); // Firestore는 'firestoreApp'에서 가져옵니다.
const firestoreAuth = firestoreApp.auth(); // Auth는 'firestoreApp'에서 가져옵니다.
const storage = firestoreApp.storage(); // Storage는 'firestoreApp'에서 가져옵니다.

// 각 인스턴스를 명확한 이름으로 내보냅니다.
module.exports = {
  db,
  firestoreDb,
  firestoreAuth,
  storage
};