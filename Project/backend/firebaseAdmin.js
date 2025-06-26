// firebaseAdmin.js
const admin = require('firebase-admin');

// 중요: Firebase 콘솔에서 다운로드한 '서비스 계정 키' JSON 파일의 경로를 정확하게 지정해야 합니다.
// 이 파일은 외부에 노출되지 않도록 주의해서 관리해야 합니다.
const serviceAccount = require('./serviceAccountKey.json');

// 중요: 본인의 Firebase Realtime Database URL로 변경해야 합니다.
const databaseURL = "https://ljg2020315018-default-rtdb.firebaseio.com/";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const db = admin.database();

module.exports = db;