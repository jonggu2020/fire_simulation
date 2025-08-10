const { firestoreAuth } = require('../firebaseAdmin');
/**
 * @desc Authorization: Bearer <ID_TOKEN> 헤더를 확인하는 미들웨어
 */
const verifyFirebaseToken = async (req, res, next) => {
    // 1. Authorization 헤더에서 값을 추출합니다.
    const authHeader = req.headers['authorization'];
    // 2. 헤더가 없거나 형식이 올바르지 않으면 401 에러 반환
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '인증 헤더가 없거나 형식이 올바르지 않습니다.' });
    }
    // 3. Bearer 토큰 형식에서 실제 토큰 추출
    const idToken = authHeader.split(' ')[1];
    try {
        // 4. 토큰 검증
        const decodedToken = await firestoreAuth.verifyIdToken(idToken);
        req.user = decodedToken;
        console.log(req.user.uid); // 검증된 사용자 정보를 요청 객체에 담아 전달
        next(); 
    } catch (error) {
        console.error('Firebase 토큰 검증 오류:', error);
        return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
};

module.exports = {
    verifyFirebaseToken
};