const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { 
    runFireSpreadPrediction, 
    getGridData, 
    getGridWithFuelInfo 
} = require('../services/simulationService');

router.post('/predict-fire-spread', async (req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] /api/predict-fire-spread: 요청 수신 (ignition_id: ${req.body.ignition_id})`);
    
    const { ignition_id } = req.body;
    if (ignition_id == null) {
        return res.status(400).json({ error: '발화점 ID가 누락되었습니다.' });
    }
    try {
        const result = await runFireSpreadPrediction(pool, ignition_id);
        res.json(result);
    } catch (err) {
        console.error('[API /predict-fire-spread] 오류:', err);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
});

router.get('/mapped-grid-data', async (req, res) => {
    try {
        const features = await getGridData(pool);
        res.json({ type: 'FeatureCollection', features });
    } catch (err) {
        console.error('[API /mapped-grid-data] 오류:', err);
        res.status(500).json({ error: 'DB 오류' });
    }
});

router.get('/grid-with-fuel-info', async (req, res) => {
    try {
        const rows = await getGridWithFuelInfo(pool);
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
        res.json({
            type: 'FeatureCollection',
            features: features
        });
    } catch (err) {
        console.error('[API /grid-with-fuel-info] 오류:', err);
        res.status(500).json({ error: 'DB 오류' });
    }
});

module.exports = router;