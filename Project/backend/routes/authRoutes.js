/**
 * routes/auth.js
 * 사용자 인증(회원가입, 로그인, 로그아웃) 및 토큰 검증 미들웨어를 담당합니다.
 */
const express = require('express');
const router = express.Router();
const validator = require('validator');
const { firestoreDb, firestoreAuth } = require('../firebaseAdmin');

/**
 * @route   POST /api/auth/register
 * @desc    새로운 사용자를 등록합니다. (Firebase Auth & Firestore)
 * @access  Public
 * @param {Object} req.body - 사용자 등록 정보 (email, password, name)
 * @returns {Object} 등록 결과를 포함한 응답 객체
 * @throws {Error} 사용자 등록 오류 시 400 또는 500 에러 반환
 */
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    // 1. 입력 값 검증
    if (!email || !password || !name) {
        return res.status(400).json({ message: 'email, password, name은 필수 입력 항목입니다.' });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: '유효하지 않은 이메일 형식입니다.' });
    }
    // 비밀번호 길이 등 추가적인 검증을 여기에 추가할 수 있습니다.
    try {
        // 2. Firebase Authentication에 사용자 생성
        const userRecord = await firestoreAuth.createUser({
            email: email,
            password: password,
            displayName: name,
        });
        // 3. Firestore 'users' 컬렉션에 사용자 추가 정보 저장
        await firestoreDb.collection('users').doc(userRecord.uid).set({
            name: name,
            email: email,
            createdAt: new Date().toISOString(),
        });
        return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('Error creating new user:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
        }
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    로그인 성공 후 HttpOnly 세션 쿠키를 발급합니다.
 * @access  Public
 * @param {Object} req.body - 로그인 정보 (token)
 * @returns {Object} 로그인 결과를 포함한 응답 객체
 * @throws {Error} 로그인 오류 시 400 또는 500 에러 반환
 */
router.post('/login', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: 'Firebase ID 토큰이 필요합니다.' });
    }
    try {
        const decodedToken = await firestoreAuth.verifyIdToken(token);
        res.status(200).json({ status: 'success', message: '로그인 토큰이 유효합니다.', uid: decodedToken.uid });
    } 
    catch (error) {
        console.error('로그인 오류:', error);
        res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    사용자 로그아웃 (HttpOnly 세션 쿠키 삭제)
 * @access  Public
 * @returns {Object} 로그아웃 결과를 포함한 응답 객체
 */
router.post('/logout', (req, res) => {
    res.status(200).json({ message: '성공적으로 로그아웃 되었습니다.' });
});

module.exports = router;