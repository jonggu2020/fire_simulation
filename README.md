1. backend/config/ 디렉토리 상에 serviceAccountKey.json 파일 추가

2. backend/ 디렉토리에 .env 파일 생성

3. .env 파일에 아래의 코드 추가.

-------------------------------------------------------------------------------------------------------

    # 동료 DB 정보로 업데이트
    DB_HOST= //별도
    DB_PORT=3306
    DB_USER= //별도
    DB_PASSWORD= //별도
    DB_NAME=fire


    REALTIME_SERVICE_ACCOUNT_PATH = ./serviceAccountKey.json
    FIRESTORE_SERVICE_ACCOUNT_KEY_PATH = ./fire-simulation-9ffc1-firebase-adminsdk-fbsvc-e64eaa74a8.json
    FIREBASE_DATABASE_URL = https://ljg2020315018-default-rtdb.firebaseio.com/ 

    # ✅ [추가] 두 번째 프로젝트의 서비스 계정 키 경로
    RTDB_SERVICE_ACCOUNT_KEY_PATH=./config/serviceAccountKey.json
-------------------------------------------------------------------------------------------------------

4. backend/ 디렉토리에 fire-simulation-9ffc1-firebase-adminsdk-fbsvc-e64eaa74a8.json 파일 추가

5. firefighter/src/firebaseConfig.js 파일 수정
-------------------------------------------------------------------------------------------------------
     // src/firebaseConfig.js
     import { initializeApp } from 'firebase/app';
     import { getDatabase } from 'firebase/database';
     import { getAuth } from 'firebase/auth'; 
     import { getFirestore } from 'firebase/firestore';
     // ✅ [추가] Firebase Storage 서비스를 사용하기 위해 getStorage를 가져옵니다.
     import { getStorage } from 'firebase/storage';
     
     const FsConfig = {
        //해당부분은 별도로 공지
     };
     
     const RtConfig = {
        //해당부분은 별도로 공지
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
-------------------------------------------------------------------------------------------------------

6. backend/model 디렉토리 상에 별도로 제공하는 학습된 모델링 파일 추가
    champion_classifier_rf.joblib
    champion_regressor_rf.joblib





!실행 방법!

1. backend> npm install
2. firefighter> npm install
3. backend> node apiServer.js
4. backend\model> python prediction_server_final_team.py
5. firefighter> npm start




