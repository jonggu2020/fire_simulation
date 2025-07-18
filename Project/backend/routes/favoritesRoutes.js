const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/authMiddleware');
// 수정된 부분: FieldValue를 'firebase-admin/firestore'에서 직접 가져옵니다.
const { firestoreDb } = require('../firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');

/**
 * @route   GET /api/favorites
 * @desc    현재 로그인된 사용자의 즐겨찾기 목록을 조회합니다.
 * @access  Private
 * @returns {Object} 즐겨찾기 목록을 포함한 응답 객체
 * @throws {Error} 즐겨찾기 조회 오류 시 500 에러 반환
 */

router.get('/', verifyFirebaseToken, async (req, res) => {
    // 인증 미들웨어를 통해 Firebase 토큰을 검증하고, 사용자 uid를 req.user에서 추출
    const { uid } = req.user;
    try {
        // Firestore에서 해당 uid의 사용자 문서 참조 생성
        const userRef = firestoreDb.collection('users').doc(uid);
        // 사용자 문서 데이터를 비동기로 가져옴
        const doc = await userRef.get();
        // 만약 사용자 문서가 존재하지 않으면, 빈 즐겨찾기 배열을 반환
        if (!doc.exists) {
            return res.status(200).json({ favorites: [] });
        }
        // 사용자 문서에서 favorites 필드를 추출 (없으면 빈 배열)
        const favorites = doc.data().favorites || [];
        // 즐겨찾기 목록을 클라이언트에 반환
        res.status(200).json({ favorites });
    } catch (error) {
        // 예외 발생 시 서버 오류 로그 출력 및 500 에러 반환
        console.error("즐겨찾기 조회 오류:", error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

/**
 * @route   POST /api/favorites
 * @desc    새로운 관측소를 사용자의 즐겨찾기에 추가합니다.
 * @access  Private
 * @param {Object} req.body - 추가할 관측소의 정보 (stationId, stationName, lat, lon)
 * @returns {Object} 추가된 즐겨찾기 정보를 포함한 응답 객체
 * @throws {Error} 즐겨찾기 추가 오류 시 500 에러 반환
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
    const { uid } = req.user;
    const { stationId, stationName, lat, lon } = req.body;

    if (!stationId || !stationName || lat === undefined || lon === undefined) {
        return res.status(400).json({ message: 'stationId, stationName, lat, lon이 모두 필요합니다.' });
    }
    try {
        const userRef = firestoreDb.collection('users').doc(uid);
        await userRef.update({
            // 관측소 Id, 관측소 이름, 위도, 경도 추가
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
 * @param {string} req.params.stationId - 삭제할 관측소의 ID
 * @returns {Object} 삭제 결과를 포함한 응답 객체
 * @throws {Error} 즐겨찾기 삭제 오류 시 500 에러 반환
 */
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
            if (doc.exists) {
            const currentFavorites = doc.data().favorites || [];
            
            // Issue : Firestore의 관측소의 ID는 number 였지만 API 요청으로 받은 stationId는 문자열이였음.
            // 수정 : API 요청으로 받은 stationId를 number로 변경하여 삭제를 진행함
            const stationIdAsNumber = parseInt(stationId, 10); // stationId를 숫자로 변환합니다.

            const updatedFavorites = currentFavorites.filter(favorite => favorite.stationId !== stationIdAsNumber);
            
            await userRef.update({
                favorites: updatedFavorites
            });
        }
    }
        res.status(200).json({ message: '즐겨찾기에서 삭제되었습니다.' });
    } catch (error) {
        console.error("즐겨찾기 삭제 오류:", error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;