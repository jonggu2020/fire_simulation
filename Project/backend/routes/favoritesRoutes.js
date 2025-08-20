const express = require('express');
const router = express.Router();
const { firestoreDb, FieldValue } = require('../firebaseAdmin');

// 이 파일은 보이지 않는 특수 문자나 인코딩 오류를 제거하기 위해 완전히 새로 작성되었습니다.

/**
 * @route   GET /api/favorites
 * @desc    현재 로그인된 사용자의 즐겨찾기 목록을 조회합니다.
 * @access  Private
 */
router.get('/', async (req, res) => {
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

/**
 * @route   POST /api/favorites
 * @desc    새로운 관측소를 사용자의 즐겨찾기에 추가합니다.
 * @access  Private
 */
router.post('/', async (req, res) => {
    const { uid } = req.user;
    const { stationId, stationName, lat, lon } = req.body;

    if (!stationId || !stationName || lat === undefined || lon === undefined) {
        return res.status(400).json({ message: 'stationId, stationName, lat, lon이 모두 필요합니다.' });
    }
    try {
        const userRef = firestoreDb.collection('users').doc(uid);
        await userRef.set({
            favorites: FieldValue.arrayUnion({ stationId, stationName, lat, lon })
        }, { merge: true });
        res.status(201).json({ message: '즐겨찾기에 추가되었습니다.' });
    } catch (error) {
        console.error("즐겨찾기 추가 오류:", error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

/**
 * @route   DELETE /api/favorites/:stationId
 * @desc    사용자의 즐겨찾기에서 특정 관측소를 삭제합니다.
 * @access  Private
 */
router.delete('/:stationId', async (req, res) => {
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
            const stationIdAsNumber = parseInt(stationId, 10);
            const updatedFavorites = currentFavorites.filter(favorite => favorite.stationId !== stationIdAsNumber);

            if (currentFavorites.length === updatedFavorites.length) {
                return res.status(404).json({ message: '삭제할 항목을 즐겨찾기에서 찾을 수 없습니다.' });
            }
            
            await userRef.update({
                favorites: updatedFavorites
            });
            res.status(200).json({ message: '즐겨찾기에서 삭제되었습니다.' });
        } else {
            res.status(404).json({ message: '사용자 정보를 찾을 수 없습니다.' });
        }
    } catch (error) {
        console.error("즐겨찾기 삭제 오류:", error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;
