// backend/routes/historicalFireRoutes.js

const express = require('express');
const router = express.Router();
const { getHistoricalFires } = require('../services/simulationService');

// ✅ [추가] 파일 시스템, 경로, CSV 파싱을 위한 모듈
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');

// ✅ [추가] 원본 데이터 파일 경로 정의
const CSV_FILE_PATH = path.resolve(__dirname, '..', 'data', 'training_dataset_final.csv');


/**
 * @route   GET /api/historical-fires
 * @desc    CSV 파일에 저장된 과거 실제 산불 데이터 목록을 가져옵니다. (기존 기능 유지)
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


/**
 * ✅ [추가] POST /api/historical-fires/exclude-point
 * @desc    특정 grid_id를 가진 데이터 포인트의 status를 'excluded'로 변경하여 영구 제외 처리합니다.
 * @access  Public (개발용)
 */
router.post('/exclude-point', (req, res) => {
    const { gridId } = req.body;

    if (!gridId) {
        return res.status(400).send({ message: 'gridId가 필요합니다.' });
    }

    const rows = [];
    let targetRowFound = false;

    // 1. CSV 파일을 스트림으로 읽습니다.
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
            console.error(error);
            return res.status(500).send({ message: 'CSV 파일을 읽는 중 오류가 발생했습니다.' });
        })
        .on('data', (row) => {
            // 2. 요청된 gridId와 일치하는 행을 찾습니다.
            if (row.grid_id === String(gridId)) {
                // 3. 해당 행의 status 값을 'excluded'로 설정합니다.
                row.status = 'excluded';
                targetRowFound = true;
                console.log(`[데이터 수정] grid_id '${gridId}'의 status를 'excluded'로 변경했습니다.`);
            }
            rows.push(row);
        })
        .on('end', () => {
            if (!targetRowFound) {
                return res.status(404).send({ message: `'${gridId}'에 해당하는 데이터를 찾을 수 없습니다.` });
            }

            // 4. 수정된 전체 데이터로 CSV 파일을 다시 씁니다 (덮어쓰기).
            csv.writeToPath(CSV_FILE_PATH, rows, { headers: true })
                .on('error', err => {
                    console.error('CSV 파일 쓰기 오류:', err);
                    return res.status(500).send({ message: 'CSV 파일을 쓰는 중 오류가 발생했습니다.' });
                })
                .on('finish', () => {
                    console.log('CSV 파일이 성공적으로 업데이트되었습니다.');
                    return res.status(200).send({ message: `grid_id '${gridId}'가 성공적으로 제외 처리되었습니다.` });
                });
        });
});


module.exports = router;