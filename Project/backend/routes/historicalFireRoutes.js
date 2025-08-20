// backend/routes/historicalFireRoutes.js 상단
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const { getHistoricalFires, loadHistoricalFireStarts } = require('../services/simulationService'); // reload 함수 제거

const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/historical-fires
 * @desc    DB에서 과거 실제 산불 데이터 목록을 가져옵니다.
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const historicalFires = await getHistoricalFires();
        res.json(historicalFires);
    } catch (error) {
        console.error('과거 산불 데이터 조회 API 오류:', error);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
});

/**
 * @route   POST /api/historical-fires/exclude-point
 * @desc    [수정] 특정 grid_id를 가진 데이터의 status를 'excluded'로 업데이트합니다.
 * @access  Public (개발용)
 */
// POST /exclude-point 라우터 (CSV 버전)
router.post('/exclude-point', (req, res) => {
    const { gridId } = req.body;
    const CSV_FILE_PATH = path.resolve(__dirname, '..', 'data', 'training_dataset_final.csv');

    if (!gridId) {
        return res.status(400).send({ message: 'gridId가 필요합니다.' });
    }

    const rows = [];
    let targetRowFound = false;

    // [주의] 이 방식은 파일 전체를 다시 쓰므로 데이터가 많을 경우 성능이 저하될 수 있으며,
    // 동시에 여러 요청이 발생할 경우 파일 손상 위험이 있습니다.
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
            console.error(error);
            return res.status(500).send({ message: 'CSV 파일을 읽는 중 오류가 발생했습니다.' });
        })
        .on('data', (row) => {
            if (row.grid_id === String(gridId)) {
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

            csv.writeToPath(CSV_FILE_PATH, rows, { headers: true })
                .on('error', err => {
                    console.error('CSV 파일 쓰기 오류:', err);
                    return res.status(500).send({ message: 'CSV 파일을 쓰는 중 오류가 발생했습니다.' });
                })
                .on('finish', async () => {
                    console.log('CSV 파일이 성공적으로 업데이트되었습니다.');
                    // 변경사항을 메모리에 즉시 반영하기 위해 데이터 리로드
                    historicalFireStarts = []; // 캐시 비우기
                    await loadHistoricalFireStarts();
                    return res.status(200).send({ message: `grid_id '${gridId}'가 성공적으로 제외 처리되었습니다.` });
                });
        });
});


module.exports = router;
