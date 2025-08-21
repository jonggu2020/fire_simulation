// src/firebaseConfig.js
 
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
 
// Firestore용 설정: process.env에서 환경 변수를 읽어옵니다.
const FsConfig = {
   apiKey: process.env.REACT_APP_FS_API_KEY,
   authDomain: process.env.REACT_APP_FS_AUTH_DOMAIN,
   projectId: process.env.REACT_APP_FS_PROJECT_ID,
   storageBucket: process.env.REACT_APP_FS_STORAGE_BUCKET,
   messagingSenderId: process.env.REACT_APP_FS_MESSAGING_SENDER_ID,
   appId: process.env.REACT_APP_FS_APP_ID,
   measurementId: process.env.REACT_APP_FS_MEASUREMENT_ID
};
 
// Realtime DB용 설정: process.env에서 환경 변수를 읽어옵니다.
const RtConfig = {
   apiKey: process.env.REACT_APP_RT_API_KEY,
   authDomain: process.env.REACT_APP_RT_AUTH_DOMAIN,
   databaseURL: process.env.REACT_APP_RT_DATABASE_URL,
   projectId: process.env.REACT_APP_RT_PROJECT_ID,
   storageBucket: process.env.REACT_APP_RT_STORAGE_BUCKET,
   messagingSenderId: process.env.REACT_APP_RT_MESSAGING_SENDER_ID,
   appId: process.env.REACT_APP_RT_APP_ID,
   measurementId: process.env.REACT_APP_RT_MEASUREMENT_ID
};
 
const FsApp = initializeApp(FsConfig);
const RtApp = initializeApp(RtConfig, "rtdbApp");
 
const auth = getAuth(FsApp);
const firestore = getFirestore(FsApp);
const database = getDatabase(RtApp);
const storage = getStorage(FsApp);
 
export { auth, database, firestore, storage };