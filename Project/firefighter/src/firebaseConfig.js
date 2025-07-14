// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';

const FsConfig = {
    //firestore
};

const RtConfig = {
    //realtime database
};

const FsApp = initializeApp(FsConfig);
const RtApp = initializeApp(RtConfig, "rtdbApp");

const auth = getAuth(FsApp);
const firestore = getFirestore(FsApp);
const database = getDatabase(RtApp);

export { auth, database, firestore };