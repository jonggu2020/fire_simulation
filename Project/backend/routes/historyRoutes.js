const express = require('express');
const router = express.Router();
const { firestoreDb } = require('../firebaseAdmin');

/**
 * @route   POST /api/history
 * @desc    시뮬레이션 결과 데이터를 Firestore에 저장합니다.
 * @access  Private
 */
router.post('/', async (req, res) => {
    const { title, simulationData } = req.body;
    const userId = req.user.uid;

    if (!userId || !title || !simulationData) {
        return res.status(400).json({ error: '필수 필드(title, simulationData)가 누락되었습니다.' });
    }

    try {
        // ✅ [수정] 복잡한 simulationData 객체를 저장하기 전에 JSON 문자열로 변환합니다.
        const simulationDataString = JSON.stringify(simulationData);

        const docRef = await firestoreDb.collection('users').doc(userId).collection('history').add({
            title,
            // ✅ [수정] 문자열로 변환된 데이터를 저장합니다.
            simulationData: simulationDataString,
            createdAt: new Date()
        });

        res.status(201).json({ message: '시뮬레이션 내역이 저장되었습니다.', id: docRef.id });

    } catch (error) {
        console.error('Firestore 저장 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

/**
 * @route   GET /api/history
 * @desc    사용자의 모든 시뮬레이션 내역 목록을 가져옵니다.
 * @access  Private
 */
router.get('/', async (req, res) => {
    const userId = req.user.uid;
    try {
        const snapshot = await firestoreDb.collection('users').doc(userId).collection('history').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            return res.json([]);
        }
        
        // ✅ [수정] Firestore에서 가져온 각 내역의 simulationData 문자열을 다시 JSON 객체로 변환합니다.
        const history = snapshot.docs.map(doc => {
            const data = doc.data();
            try {
                // simulationData가 문자열일 경우에만 JSON.parse를 시도합니다.
                if (typeof data.simulationData === 'string') {
                    data.simulationData = JSON.parse(data.simulationData);
                }
            } catch (e) {
                console.error(`History ID ${doc.id}의 simulationData 파싱 오류:`, e);
                // 파싱에 실패하면 원본 데이터나 null을 반환하여 앱 충돌을 방지합니다.
                data.simulationData = null; 
            }
            return { id: doc.id, ...data };
        });

        res.json(history);
    } catch (error) {
        console.error('Firestore 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
