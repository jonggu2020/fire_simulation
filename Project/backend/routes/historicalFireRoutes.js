// backend/routes/historicalFireRoutes.js (신규 파일)

const express = require('express');
const router = express.Router();
const { getHistoricalFires } = require('../services/simulationService');

/**
 * @route   GET /api/historical-fires
 * @desc    CSV 파일에 저장된 과거 실제 산불 데이터 목록을 가져옵니다.
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        // 서비스 로직을 호출하여 처리된 데이터를 가져옵니다.
        const historicalFires = await getHistoricalFires();
        res.json(historicalFires);
    } catch (error) {
        console.error('과거 산불 데이터 조회 API 오류:', error);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
});

module.exports = router;
