// backend/apiServer.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path'); // path 모듈이 있는지 확인해주세요.
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// 1. 기존 시뮬레이션 API 라우트
app.use('/api', apiRoutes);

// 2. [핵심] 크롤링 데이터를 제공하는 정적 경로 설정
// __dirname은 현재 파일(apiServer.js)이 있는 'backend' 폴더를 가리킵니다.
// '..'는 한 단계 상위 폴더인 'Project' 폴더로 이동합니다.
// 최종적으로 'Project/shared_data' 폴더를 가리키게 됩니다.
const sharedDataPath = path.join(__dirname, '..', 'shared_data');

// '/data' 라는 URL로 요청이 오면, 위에서 지정한 sharedDataPath 폴더에서 파일을 찾아 제공합니다.
app.use('/data', express.static(sharedDataPath));

// 서버 실행 시 터미널에 로그를 출력하여 경로가 올바른지 확인합니다.
console.log(`[서버 설정] /data URL을 ${sharedDataPath} 폴더로 연결했습니다.`);


// 3. React 앱 빌드 파일을 제공하는 정적 경로 설정
// (주의: 이 코드는 React 프로젝트를 'npm run build' 했을 때만 정상 작동합니다)
const buildPath = path.join(__dirname, '..', 'firefighter', 'build');
app.use(express.static(buildPath));
console.log(`[서버 설정] React 앱 기본 경로를 ${buildPath} 폴더로 연결했습니다.`);


// 4. 위에서 처리되지 않은 모든 요청은 React 앱의 index.html로 보냅니다. (SPA 라우팅 처리)
// 이 미들웨어는 항상 다른 경로 설정들보다 마지막에 위치해야 합니다.
app.use((req, res, next) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// 서버 실행
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ 서버가 http://0.0.0.0:${port} 에서 성공적으로 실행되었습니다.`);
});