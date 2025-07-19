// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';

const FsConfig = {
    // FirStore Config
};

const RtConfig = {
    // Realtime DB Config
};

const FsApp = initializeApp(FsConfig);
const RtApp = initializeApp(RtConfig, "rtdbApp");

const auth = getAuth(FsApp);
const firestore = getFirestore(FsApp);
const database = getDatabase(RtApp);

export { auth, database, firestore };