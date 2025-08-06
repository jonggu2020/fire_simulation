const express = require('express');
const router = express.Router();
const validator = require('validator');
const { firestoreDb, firestoreAuth } = require('../firebaseAdmin');

router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ message: 'email, password, name은 필수 입력 항목입니다.' });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: '유효하지 않은 이메일 형식입니다.' });
    }
    try {
        const userRecord = await firestoreAuth.createUser({
            email: email,
            password: password,
            displayName: name,
        });
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

router.post('/logout', (req, res) => {
    res.status(200).json({ message: '성공적으로 로그아웃 되었습니다.' });
});

module.exports = router;
