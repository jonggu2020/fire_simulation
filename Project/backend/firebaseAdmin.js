// backend/firebaseAdmin.js
const admin = require('firebase-admin');
// 1. 각 db의 서비스 권한을 가져옵니다
const rtdbServiceAccount = require(process.env.REALTIME_SERVICE_ACCOUNT_PATH);
const firestoreServiceAccount = require(process.env.FIRESTORE_SERVICE_ACCOUNT_KEY_PATH);


const rtdbApp = admin.initializeApp({
  credential: admin.credential.cert(rtdbServiceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL // <------ 자신의 DB url을 입력하세요
}, 'rtdbApp');

const firestoreApp = admin.initializeApp({
  credential: admin.credential.cert(firestoreServiceAccount)
}, 'firestoreApp');

const db = rtdbApp.database();
const firestoreDb = firestoreApp.firestore();
const firestoreAuth = firestoreApp.auth();
const storage = firestoreApp.storage();

module.exports = {
  db,
  firestoreDb,
  firestoreAuth,
  storage
};