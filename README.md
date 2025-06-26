
# 👨‍🚒 FireFighter: 산불 확산 예측 시뮬레이션

본 프로젝트는 사용자가 지정한 발화점을 기준으로, 실시간 산악 기상 데이터와 지리 데이터를 종합하여 산불의 확산 경로 및 피해 범위를 시각적으로 예측하는 풀스택 웹 애플리케이션입니다.

- **Frontend**: React, OpenLayers
- **Backend**: Node.js, Express
- **Database**: MySQL, Firebase Realtime Database

## 📝 목차

1.  [프로젝트 구조](#-프로젝트-구조)
2.  [사전 준비 사항](#-사전-준비-사항)
3.  [백엔드 설정](#-백엔드-설정)
4.  [프론트엔드 설정](#-프론트엔드-설정)
5.  [실행 방법](#-실행-방법)
6.  [주요 기능](#-주요-기능)

---

## 📁 프로젝트 구조

프로젝트는 `backend`와 `frontend`(`src`)로 구성되어 있습니다.

/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── routes/
│   │   └── apiRoutes.js
│   ├── services/
│   │   └── simulationService.js
│   ├── apiServer.js
│   ├── firebaseAdmin.js
│   ├── updateFirebaseWeather.js
│   ├── mountainStations.js  <-- (중요) 설정 필요
│   ├── serviceAccountKey.json <-- (중요) 설정 필요
│   ├── package.json
│   └── .env                   <-- (중요) 설정 필요
│
└── firefighter/
└── src/
    ├── components/
    │   ├── Home.js
    │   ├── VWorldMap.js
    │   ├── Legend.js
    │   ├── MapCanvas.js
    │   ├── mapConfig.js
    │   ├── weatherService.js
    │   └── mountainStations.js
    ├── App.js
    └── ... (기타 React 파일)

---

## ⚙️ 사전 준비 사항

애플리케이션을 실행하기 전에 다음 환경이 준비되어야 합니다.

- **Node.js**: v18.x 이상 권장
- **MySQL**: 실행 중인 MySQL 데이터베이스 인스턴스
- **Firebase 프로젝트**:
    - Firebase Realtime Database 활성화
    - 서비스 계정 키(`serviceAccountKey.json`) 파일
    - 웹 앱용 Firebase 구성 정보

---

## 🔥 백엔드 설정

백엔드 서버 및 서비스 실행을 위한 설정입니다.

1.  **디렉토리 이동**
    터미널에서 `backend` 디렉토리로 이동합니다.
    ```bash
    cd backend
    ```

2.  **의존성 설치**
    `package.json`에 명시된 모든 패키지를 설치합니다.
    ```bash
    npm install
    ```

3.  **Firebase 서비스 계정 키 설정**
    - Firebase 콘솔의 **[프로젝트 설정] > [서비스 계정]** 탭에서 '새 비공개 키 생성'을 통해 `.json` 파일을 다운로드합니다.
    - 다운로드한 파일의 이름을 `serviceAccountKey.json`으로 변경하고 `backend` 폴더 내에 위치시킵니다.

4.  **환경변수 파일(`.env`) 생성**
    `backend` 폴더 내에 `.env` 파일을 생성하고, 아래 내용을 본인의 데이터베이스 정보에 맞게 수정하여 채워넣습니다. 추후에 데이터 알려드리겠습니다.
    ```env
    # MySQL DB 연결 정보
    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=root # 본인의 DB 사용자 이름
    DB_PASSWORD=password # 본인의 DB 비밀번호
    DB_NAME=db # 본인의 데이터베이스 이름
    ```

## 💧 프론트엔드 설정

React 애플리케이션 실행을 위한 설정입니다.

1.  **디렉토리 이동**
    프로젝트의 최상위 디렉토리(예: `firefighter`)로 이동합니다.
    ```bash
    cd ..
    # (backend 폴더에서 나왔다고 가정)
    cd firefighter
    ```

2.  **의존성 설치**
    ```bash
    npm install
    ```


## 🚀 실행 방법

백엔드 서버와 프론트엔드 개발 서버를 각각 실행해야 합니다.

1.  **백엔드 실행**
    - **API 서버 실행**: `backend` 폴더에서 다음 명령어를 실행합니다. API 서버는 `http://localhost:3001`에서 실행됩니다.
      ```bash
      node apiServer.js
      ```
    - **날씨 데이터 업데이트 서비스 실행**:  !생략해도 됨!
    (선택 사항) Firebase에 주기적으로 기상 데이터를 업데이트하려면, 별도의 터미널을 열어 `backend` 폴더에서 다음을 실행합니다. 이 스크립트는 1시간마다 실행됩니다.
      ```bash
      node updateFirebaseWeather.js
      ```

2.  **프론트엔드 실행**
    - **React 앱 실행**: 프로젝트 최상위 폴더(`firefighter`)에서 다음 명령어를 실행합니다.
      ```bash
      npm start
      ```
    - 실행 후, 웹 브라우저에서 `http://localhost:3000` 주소로 접속하면 애플리케이션을 확인할 수 있습니다.

---

## ✨ 주요 기능

- **지도 기반 인터페이스**: OpenLayers를 사용하여 VWorld 지도를 표시합니다.
- **격자 데이터 시각화**: 전국 산림 격자 데이터를 지도 위에 렌더링합니다.
- **발화점 지정**: 사용자가 지도 위의 격자점을 클릭하여 산불 시뮬레이션의 시작점을 선택할 수 있습니다.
- **동적 확산 시뮬레이션**:
    - 백엔드에서 물리 모델을 기반으로 산불 확산 결과를 계산합니다.
    - 시간 경과에 따른 연소(빨강), 확산 예상(노랑), 연소 완료(검정) 상태를 동적으로 시각화합니다.
- **시간 제어 기능**: 슬라이더와 버튼을 통해 사용자가 원하는 시간대의 확산 결과를 확인할 수 있습니다.
- **레이어 컨트롤 및 범례**: 각 데이터 레이어(격자, 관측소, 예측 결과)의 가시성을 제어하고, 범례를 통해 각 색상의 의미를 확인할 수 있습니다.
