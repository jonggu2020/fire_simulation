const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/authMiddleware');
// 수정된 부분: FieldValue를 'firebase-admin/firestore'에서 직접 가져옵니다.
const { firestoreDb } = require('../firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');

// GET /api/favorites - 즐겨찾기 목록 조회
router.get('/', verifyFirebaseToken, async (req, res) => {
    const { uid } = req.user;
    try {
        const userRef = firestoreDb.collection('users').doc(uid);
        const doc = await userRef.get();
        if (!doc.exists) {
            return res.status(200).json({ favorites: [] });
        }
        const favorites = doc.data().favorites || [];
        res.status(200).json({ favorites });
    } catch (error) {
        console.error("즐겨찾기 조회 오류:", error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// POST /api/favorites - 즐겨찾기 추가
router.post('/', verifyFirebaseToken, async (req, res) => {
    const { uid } = req.user;
    // --- 수정된 부분: body에서 lat, lon을 추가로 받습니다. ---
    const { stationId, stationName, lat, lon } = req.body;

    if (!stationId || !stationName || lat === undefined || lon === undefined) {
        return res.status(400).json({ message: 'stationId, stationName, lat, lon이 모두 필요합니다.' });
    }
    try {
        const userRef = firestoreDb.collection('users').doc(uid);
        // --- 수정된 부분: 저장하는 객체에 lat, lon을 추가합니다. ---
        await userRef.update({
            favorites: FieldValue.arrayUnion({ stationId, stationName, lat, lon })
        }, { merge: true }); // 사용자가 처음 즐겨찾기를 추가할 때 favorites 필드가 없으므로 merge 옵션 추가
        res.status(201).json({ message: '즐겨찾기에 추가되었습니다.' });
    } catch (error) {
        console.error("즐겨찾기 추가 오류:", error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// DELETE /api/favorites/:stationId - 즐겨찾기 삭제
router.delete('/:stationId', verifyFirebaseToken, async (req, res) => {
    const { uid } = req.user;
    const { stationId } = req.params;

    if (!stationId) {
        return res.status(400).json({ message: 'stationId가 필요합니다.' });
    }
    try {
        const userRef = firestoreDb.collection('users').doc(uid);
        const doc = await userRef.get();

        if (doc.exists) {
            const currentFavorites = doc.data().favorites || [];
            const updatedFavorites = currentFavorites.filter(fav => fav.stationId !== stationId);
            
            await userRef.update({
                favorites: updatedFavorites
            });
        }
        res.status(200).json({ message: '즐겨찾기에서 삭제되었습니다.' });
    } catch (error) {
        console.error("즐겨찾기 삭제 오류:", error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;