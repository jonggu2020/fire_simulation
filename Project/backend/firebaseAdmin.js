// backend/firebaseAdmin.js

const admin = require('firebase-admin');

// --- 1. Firestore, Auth, Storage용 앱 초기화 ---
// .env 파일에 FIRESTORE_SERVICE_ACCOUNT_KEY_PATH가 정의되어 있어야 합니다.
const firestoreServiceAccount = require(process.env.FIRESTORE_SERVICE_ACCOUNT_KEY_PATH);

// 앱에 고유한 이름을 부여하여 다른 앱과 구별합니다.
const firestoreApp = admin.initializeApp({
  credential: admin.credential.cert(firestoreServiceAccount),
}, 'firestoreApp');


// --- 2. Realtime Database용 앱 초기화 ---
// .env 파일에 RTDB_SERVICE_ACCOUNT_KEY_PATH와 FIREBASE_DATABASE_URL이 정의되어 있어야 합니다.
const rtdbServiceAccount = require(process.env.RTDB_SERVICE_ACCOUNT_KEY_PATH);

// 앱에 고유한 이름을 부여하여 다른 앱과 구별합니다.
const rtdbApp = admin.initializeApp({
  credential: admin.credential.cert(rtdbServiceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL 
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
