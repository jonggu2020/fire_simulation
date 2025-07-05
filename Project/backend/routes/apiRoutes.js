// Express 프레임워크를 사용하기 위해 모듈을 가져옵니다.
const express = require('express');
// Express 라우터를 생성합니다.
const router = express.Router();
// 데이터베이스 연결 설정을 가져옵니다.
const pool = require('../config/db');
// ??
const { 
    runFireSpreadPrediction, 
    getGridData, 
    getGridWithFuelInfo 
} = require('../services/simulationService');


router.post('/predict-fire-spread', async (req, res) => {
    // 요청 수신 로그를 기록합니다.
    console.log(`[${new Date().toLocaleTimeString()}] /api/predict-fire-spread: 요청 수신 (ignition_id: ${req.body.ignition_id})`);
    
    // 요청 본문에서 발화점 ID를 추출합니다.
    const { ignition_id } = req.body;
    // 발화점 ID가 없는 경우, 400 상태 코드와 함께 오류 메시지를 반환합니다.
    if (ignition_id == null) {
        return res.status(400).json({ error: '발화점 ID가 누락되었습니다.' });
    }
    try {
        // runFireSpreadPrediction을 실행합니다.
        const result = await runFireSpreadPrediction(pool, ignition_id);
        // 결과를 JSON 형태로 응답합니다.
        res.json(result);
    } catch (err) {
        // 오류 발생 시, 콘솔에 오류를 기록하고 500 상태 코드와 함께 오류 메시지를 반환합니다.
        console.error('[API /predict-fire-spread] 오류:', err);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
});

// GET : 필요한 위치 정보를 제공하는 api
router.get('/mapped-grid-data', async (req, res) => {
    try {
        // getGridData 함수를 호출한다.
        const features = await getGridData(pool);
        // FeatureCollection 형태로 데이터를 응답합니다.
        res.json({ type: 'FeatureCollection', features });
    } catch (err) {
        // 오류 발생 시, 콘솔에 오류를 기록하고 500 상태 코드와 함께 오류 메시지를 반환합니다.
        console.error('[API /mapped-grid-data] 오류:', err);
        res.status(500).json({ error: 'DB 오류' });
    }
});


router.get('/grid-with-fuel-info', async (req, res) => {
    try {
        // getGridWithFuelInfo를 호출한다.
        const rows = await getGridWithFuelInfo(pool);
        // 데이터베이스에서 받은 데이터를 mapping시켜 GeoJSON 형태로 변환합니다.
        const features = rows.map(row => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [parseFloat(row.lng), parseFloat(row.lat)]
            },
            properties: {
                id: row.id,
                fuel_score: row.fuel_score 
            }
        }));
        // GeoJSON FeatureCollection 형태로 데이터를 응답합니다.
        res.json({
            type: 'FeatureCollection',
            features: features
        });
    } catch (err) {
        // 오류 발생 시, 콘솔에 오류를 기록하고 500 상태 코드와 함께 오류 메시지를 반환합니다.
        console.error('[API /grid-with-fuel-info] 오류:', err);
        res.status(500).json({ error: 'DB 오류' });
    }
});

// 설정된 라우터를 모듈로 내보냅니다.
module.exports = router;