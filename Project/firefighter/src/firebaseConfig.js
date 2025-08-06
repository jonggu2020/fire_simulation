 // src/firebaseConfig.js
 import { initializeApp } from 'firebase/app';
 import { getDatabase } from 'firebase/database';
 import { getAuth } from 'firebase/auth'; 
 import { getFirestore } from 'firebase/firestore';
 // ✅ [추가] Firebase Storage 서비스를 사용하기 위해 getStorage를 가져옵니다.
 import { getStorage } from 'firebase/storage';

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
// ✅ [추가] Firestore/Auth와 동일한 앱(FsApp)을 사용하여 Storage 서비스를 초기화합니다.
const storage = getStorage(FsApp);

// ✅ [추가] 초기화된 storage 인스턴스를 export하여 다른 파일에서 사용할 수 있도록 합니다.
export { auth, database, firestore, storage };
