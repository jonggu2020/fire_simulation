// backend/apiServer.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');
const authRouter = require('./routes/authRoutes');
const favoritesRouter = require('./routes/favoritesRoutes');
const historyRouter = require('./routes/historyRoutes');
const historicalFireRouter = require('./routes/historicalFireRoutes');
const { verifyFirebaseToken } = require('./middleware/authMiddleware');
const { loadHistoricalFireStarts } = require('./services/simulationService');

const app = express();
const port = 3001;

const corsOptions = {
    origin: 'http://localhost:3000',
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ✅ [수정] API 라우트 순서를 조정하여 구체적인 경로를 일반적인 경로보다 먼저 배치합니다.
app.use('/api/auth', authRouter);
app.use('/api/favorites', verifyFirebaseToken, favoritesRouter);
app.use('/api/history', verifyFirebaseToken, historyRouter);
app.use('/api/historical-fires', historicalFireRouter);
// '/api'를 사용하는 일반 라우터는 가장 마지막에 배치하여 충돌을 방지합니다.
app.use('/api', apiRoutes);


// 정적 파일 제공 및 SPA 라우팅 처리 (기존과 동일)
const sharedDataPath = path.join(__dirname, '..', 'shared_data');
app.use('/data', express.static(sharedDataPath));
console.log(`[서버 설정] /data URL을 ${sharedDataPath} 폴더로 연결했습니다.`);

const buildPath = path.join(__dirname, '..', 'firefighter', 'build');
app.use(express.static(buildPath));
console.log(`[서버 설정] React 앱 기본 경로를 ${buildPath} 폴더로 연결했습니다.`);

app.use((req, res, next) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// 서버 실행 로직 (기존과 동일)
console.log("서버 시작 전, 과거 산불 데이터를 메모리에 로드합니다...");
loadHistoricalFireStarts().then(() => {
    console.log("   ✅ 과거 데이터 로드 성공.");
    app.listen(port, '0.0.0.0', () => {
        console.log(`✅ 서버가 http://0.0.0.0:${port} 에서 성공적으로 실행되었습니다.`);
    });
}).catch(error => {
    console.error("🚨 서버 시작 실패: 과거 데이터 로딩 중 심각한 오류 발생", error);
    process.exit(1);
});
