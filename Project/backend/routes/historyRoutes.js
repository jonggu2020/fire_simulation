const express = require('express');
const router = express.Router();
const { firestore } = require('../firebaseAdmin');

// POST /api/history - 시뮬레이션 내역 저장
router.post('/', async (req, res) => {
    const { title, imageUrl, simulationData } = req.body;
    const userId = req.user.uid; // authMiddleware에서 추가해준 사용자 ID

    if (!userId || !title || !imageUrl || !simulationData) {
        return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    try {
        const docRef = await firestore.collection('users').doc(userId).collection('history').add({
            title,
            imageUrl,
            simulationData, // 시뮬레이션 데이터도 함께 저장
            createdAt: new Date()
        });
        res.status(201).json({ message: '시뮬레이션 내역이 저장되었습니다.', id: docRef.id });
    } catch (error) {
        console.error('Firestore 저장 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// GET /api/history - 시뮬레이션 내역 목록 가져오기
router.get('/', async (req, res) => {
    const userId = req.user.uid;

    try {
        const snapshot = await firestore.collection('users').doc(userId).collection('history').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            return res.json([]);
        }
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(history);
    } catch (error) {
        console.error('Firestore 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
