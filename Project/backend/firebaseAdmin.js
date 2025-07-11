// backend/firebaseAdmin.js
const admin = require('firebase-admin');

// 1. 각 db의 서비스 권한을 가져옵니다
const rtdbServiceAccount = require('./realtimeDB 서비스 json파일 이름');
const firestoreServiceAccount = require('./firestore 서비스 json 파일 이름');


const rtdbApp = admin.initializeApp({
  credential: admin.credential.cert(rtdbServiceAccount),
  databaseURL: "my-realtime-db-url" // <------ 자신의 DB url을 입력하세요
}, 'rtdbApp');

const firestoreApp = admin.initializeApp({
  credential: admin.credential.cert(firestoreServiceAccount)
}, 'firestoreApp');

const db = rtdbApp.database();
const firestoreDb = firestoreApp.firestore();
const firestoreAuth = firestoreApp.auth();

module.exports = {
  db,
  firestoreDb,
  firestoreAuth
};