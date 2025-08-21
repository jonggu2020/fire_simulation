# 👨‍🚒 산불 예측 통합 관제 시스템 (FireFighter)

**Output**팀의 AI 기반 산불 확산 예측 및 통합 관제 웹 애플리케이션입니다.

### 프로젝트 소개

산림 면적이 넓은 국내 환경에서는 단 한 번의 불씨가 수십 ㎞²까지 번질 위험이 있습니다. 하지만 기존의 산불 위험지도는 과거 통계에 기반한 **정적(Static) 자료**라, 실시간으로 변하는 바람·습도·지형 효과를 반영하지 못했습니다. 결과적으로 "지금 어디로 불길이 튈지"를 예측할 동적 도구가 부재했고, 초기 진화 및 대피 의사결정이 늦어지는 문제가 반복됐습니다.

**'산불 예측 통합 관제 시스템'**은 이 공백을 메우기 위해 출발했습니다. 본 시스템은 사용자가 발화점을 지정하면, 실시간 산악 기상 데이터와 **산림청**의 고해상도 지형 데이터를 결합하여 **듀얼 엔진** 중 하나를 가동합니다. 예측 결과는 OpenLayers 기반 지도 위에 즉각 시각화됩니다.

시스템의 핵심인 듀얼 엔진은 다음과 같습니다.

1.  **하이브리드 엔진:** 산림청의 임상/토양도 기반 **물리 모델**과 **NASA**의 위성 데이터를 학습한 **딥러닝(DNN) 모델**을 결합해, 새로운 상황에서도 합리적인 예측을 수행합니다.
2.  **사례기반 엔진(CBR):** **MySQL에 구축된 16만 건 이상의 과거 산불 데이터** 중, 현재 상황과 가장 유사한 사례의 확산 패턴을 적용합니다.

새로운 산불 발생 시, 과거 사례와의 **유사도를 평가하여 70% 이상**이면 사례기반 엔진을, 그렇지 않으면 하이브리드 엔진을 사용하여 최적의 시뮬레이션을 실행합니다.

## ✨ 주요 기능

-   **듀얼 AI 예측 엔진**: '사례 기반'과 '하이브리드 생성형' 모델을 상황에 맞게 자동 선택하여 예측 정확도 향상.
-   **실시간 예측 시뮬레이션**: 사용자가 지정한 발화점을 기준으로, 시간 경과에 따른 확산 범위를 동적으로 시각화.
-   **과거 산불 데이터 분석**: 16만 건 이상의 과거 산불 이력을 지도 위에서 애니메이션으로 복원하고 분석.
-   **사용자 맞춤 기능**: Firebase Auth 기반의 회원가입/로그인, 즐겨찾는 관측소 저장, 시뮬레이션 내역 관리 기능.
-   **데이터 관리 기능 (BETA)**: 분석에 방해가 되는 노이즈 데이터를 관리자가 직접 제외하여 시스템의 학습 데이터 품질을 지속적으로 개선.
-   **실시간 산불 위치 크롤링**: `selenium_fire_crawler.py`를 통해 산림청의 실시간 산불 정보를 크롤링하고, 이미지 분석을 통해 좌표를 추출하여 지도에 마커로 표시.


### 필수적으로 필요한 파일
1. **serviceAccountKey.json**: 서비스키(파이어베이스 리얼타임)
2. **champion_classifier_rf.joblib**: 분류모델
3. **champion_regressor_rf.joblib**: 회귀모델
4. **.env**: MySQL DB접속 / 서비스 계정 키
5. **추가 서비스키.json**(파이어베이스 👨‍🚒 산불 예측 통합 관제 시스템 (FireFighter)

**Output**팀의 AI 기반 산불 확산 예측 및 통합 관제 웹 애플리케이션입니다.


### 프로젝트 소개

산림 면적이 넓은 국내 환경에서는 단 한 번의 불씨가 수십 ㎞²까지 번질 위험이 있습니다. 하지만 기존의 산불 위험지도는 과거 통계에 기반한 **정적(Static) 자료**라, 실시간으로 변하는 바람·습도·지형 효과를 반영하지 못했습니다. 결과적으로 "지금 어디로 불길이 튈지"를 예측할 동적 도구가 부재했고, 초기 진화 및 대피 의사결정이 늦어지는 문제가 반복됐습니다.

**'산불 예측 통합 관제 시스템'**은 이 공백을 메우기 위해 출발했습니다. 본 시스템은 사용자가 발화점을 지정하면, 실시간 산악 기상 데이터와 **산림청**의 고해상도 지형 데이터를 결합하여 **듀얼 엔진** 중 하나를 가동합니다. 예측 결과는 OpenLayers 기반 지도 위에 즉각 시각화됩니다.

시스템의 핵심인 듀얼 엔진은 다음과 같습니다.

1.  **하이브리드 엔진:** 산림청의 임상/토양도 기반 **물리 모델**과 **NASA**의 위성 데이터를 학습한 **딥러닝(DNN) 모델**을 결합해, 새로운 상황에서도 합리적인 예측을 수행합니다.
2.  **사례기반 엔진(CBR):** **MySQL에 구축된 16만 건 이상의 과거 산불 데이터** 중, 현재 상황과 가장 유사한 사례의 확산 패턴을 적용합니다.

새로운 산불 발생 시, 과거 사례와의 **유사도를 평가하여 70% 이상**이면 사례기반 엔진을, 그렇지 않으면 하이브리드 엔진을 사용하여 최적의 시뮬레이션을 실행합니다.

## ✨ 주요 기능

-   **듀얼 AI 예측 엔진**: '사례 기반'과 '하이브리드 생성형' 모델을 상황에 맞게 자동 선택하여 예측 정확도 향상.
-   **실시간 예측 시뮬레이션**: 사용자가 지정한 발화점을 기준으로, 시간 경과에 따른 확산 범위를 동적으로 시각화.
-   **과거 산불 데이터 분석**: 16만 건 이상의 과거 산불 이력을 지도 위에서 애니메이션으로 복원하고 분석.
-   **사용자 맞춤 기능**: Firebase Auth 기반의 회원가입/로그인, 즐겨찾는 관측소 저장, 시뮬레이션 내역 관리 기능.
-   **데이터 관리 기능 (BETA)**: 분석에 방해가 되는 노이즈 데이터를 관리자가 직접 제외하여 시스템의 학습 데이터 품질을 지속적으로 개선.
-   **실시간 산불 위치 크롤링**: `selenium_fire_crawler.py`를 통해 산림청의 실시간 산불 정보를 크롤링하고, 이미지 분석을 통해 좌표를 추출하여 지도에 마커로 표시.

## 📁 프로젝트 구조

프로젝트는 `backend`와 `frontend`(`src`)로 구성되어 있습니다.

/
├── backend/
│   ├── config/
│   │   └── db.js  
│   │   └── serviceAccountKey           # (중요) 설정 필요
│   ├── data/
│   │   └── training_dataset_final.csv  #임시 csv파일. 해당 파일은 db에 옮길 예정
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── apiRoutes.js
│   │   ├── authRoutes.js
│   │   ├── favoritesRoutes.js
│   │   ├── historyRoutes.js
│   │   └── historicalFireRoutes.js
│   ├── services/
│   │   └── simulationService.js
│   ├── apiServer.js
│   ├── migrateData.js                # (DB 데이터 이전 스크립트)
│   ├── firebaseAdmin.js
│   ├── updateFirebaseWeather.js
│   ├── serviceAccountKey.json        # (중요) 설정 필요
│   └── .env                          # (중요) 설정 필요
│
└── firefighter/
    └── src/
        ├── components/
        │   ├── Header.js
        │   └── ...
        ├── pages/
        │   ├── HistoricalMap.js
        │   ├── LoginPage.js
        │   ├── MainPage.js
        │   └── RegisterPage.js
        ├── App.js
        ├── firebase.js                 # (중요) 설정 필요



## ⚙️ 사전 준비사항

프로젝트를 로컬 환경에서 실행하기 위해 다음 소프트웨어가 설치되어 있어야 합니다.

-   Node.js (v18 이상 권장)
-   Python (v3.9 이상 권장)
-   MySQL Server
-   Google Firebase 계정 및 프로젝트 설정
-   Google Chrome 및 버전에 맞는 ChromeDriver

---

## 🔥 백엔드 설정

백엔드 서버 및 서비스 실행을 위한 설정입니다.

1.  **프로젝트 클론 및 의존성 설치**
    터미널에서 `backend` 디렉토리로 이동합니다.
    ```bash
    git clone https://github.com/jonggu2020/fire_simulation.git
    ```

2.  **의존성 설치**
    `package.json`에 명시된 모든 패키지를 설치합니다.
    backend/
    ```bash
    npm install
    ```


3.  **환경변수 파일(`.env`) 생성**
    1. backend 폴더의 .env.example 파일을 복사하여 .env 파일을 생성합니다.
    2. 생성된 .env 파일을 열어 본인의 환경에 맞게 모든 값을 채워넣습니다.




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

3. **프론트엔드 .env.local 파일 설정**
    1. firefighter 폴더에 .env.local 파일을 새로 생성합니다.
    2. Firebase 콘솔에서 확인한 본인의 설정값으로 모두 채워넣습니다.

## ▶️ 실행 방법

아래의 각 서버 및 스크립트는 **별개의 터미널에서 실행**해야 합니다.

1.  **AI 예측 서버 실행**:
    ```bash
    cd backend/model
    pip install -r requirements.txt # (requirements.txt가 필요할 경우)
    python prediction_server_final_team.py
    ```
    *서버가 `http://127.0.0.1:5000`에서 실행됩니다.*

2.  **백엔드 서버 실행**:
    ```bash
    cd backend
    node apiServer.js
    ```
    *서버가 `http://localhost:3001`에서 실행됩니다.*

3.  **프론트엔드 개발 서버 실행**:
    ```bash
    cd firefighter
    npm start
    ```
    *애플리케이션이 `http://localhost:3000`에서 열립니다.*

4.  **데이터 수집 스크립트 실행** (선택사항, 실시간 데이터 확인 시):
    -   **날씨 정보 수집기**:
        ```bash
        cd baclemd
        node updateFirebaseWeather.js
        ```
    -   **산불 위치 크롤러**: (ChromeDriver 경로를 `selenium_fire_crawler.py` 내에서 수정해야 할 수 있음)
        ```bash
        cd crawl_map
        pip install selenium pillow apscheduler
        python selenium_fire_crawler.py
        ```

이제 브라우저에서 `http://localhost:3000`에 접속하여 FireFighter 서비스를 사용할 수 있습니다.

---







