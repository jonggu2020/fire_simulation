// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth'; 

const firebaseConfig = {
    apiKey: "AIzaSyCrVZaqFjeaOVikJZiEHGj__BH0sAsl904",
    authDomain: "ljg2020315018.firebaseapp.com",
    databaseURL: "https://ljg2020315018-default-rtdb.firebaseio.com",
    projectId: "ljg2020315018",
    storageBucket: "ljg2020315018.firebasestorage.app",
    messagingSenderId: "872774536997",
    appId: "1:872774536997:web:70e5b7194afa59988d94cc",
    measurementId: "G-F07QGHJXDY"
  };
// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스 인스턴스를 가지고옵니다
const database = getDatabase(app);
const auth = getAuth(app);
export { auth, database };