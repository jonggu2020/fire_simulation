// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // 1. storage import 합니다.

const FsConfig = {
    //FireStore
};

const RtConfig = {
    //RealTimeDB
};

const FsApp = initializeApp(FsConfig);
const RtApp = initializeApp(RtConfig, "rtdbApp");

const auth = getAuth(FsApp);
const firestore = getFirestore(FsApp);
const database = getDatabase(RtApp);
const storage = getStorage(FsApp); // 2. storage를 초기화합니다.

export { auth, database, firestore, storage }; // 3. storage를 export에 추가합니다.