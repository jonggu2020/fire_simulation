// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // 1. getStorage를 import합니다.

const FsConfig = {
    apiKey: "AIzaSyBCjSKvzR1b_S3UheJDTESTlMr0ff5zsxo",
    authDomain: "fire-simulation-9ffc1.firebaseapp.com",
    projectId: "fire-simulation-9ffc1",
    storageBucket: "gs://fire-simulation-9ffc1.firebasestorage.app",
    messagingSenderId: "458640372825",
    appId: "1:458640372825:web:9bb4ce0cfca10bdae06d48",
    measurementId: "G-7K4QJ15EE8"
};

const RtConfig = {
    apiKey: "AIzaSyCrVZaqFjeaOVikJZiEHGj__BH0sAsl904",
    authDomain: "ljg2020315018.firebaseapp.com",
    databaseURL: "https://ljg2020315018-default-rtdb.firebaseio.com",
    projectId: "ljg2020315018",
    storageBucket: "ljg2020315018.firebasestorage.app",
    messagingSenderId: "872774536997",
    appId: "1:872774536997:web:70e5b7194afa59988d94cc",
    measurementId: "G-F07QGHJXDY"
};

const FsApp = initializeApp(FsConfig);
const RtApp = initializeApp(RtConfig, "rtdbApp");

const auth = getAuth(FsApp);
const firestore = getFirestore(FsApp);
const database = getDatabase(RtApp);
const storage = getStorage(FsApp); // 2. storage를 초기화합니다.

export { auth, database, firestore, storage }; // 3. storage를 export에 추가합니다.