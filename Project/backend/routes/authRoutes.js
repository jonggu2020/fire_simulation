const express = require('express');
const router = express.Router();
const { firestoreDb, firestoreAuth } = require('../firebaseAdmin');
const validator = require('validator');

/**
 * @route   POST /api/register
 * @desc    새로운 User를 등록합니다
 * @request {
 *    "email": "user@example.com",
 *    "password": "yourpassword",
 *    "name": "Your Name"
 * }
 * @response 201 {
 *    "message": "회원가입이 완료되었습니다."
 * }
 * @response 400 {
 *    "message": "email, password, name은 필수입력 항목입니다."
 * }
 * @response 400 {
 *    "message": "유효하지 않은 이메일 형식입니다."
 * }
 * @response 500 {
 *    "message": "Internal Server Error"
 * }
 */
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
            return res.status(400).json({ message: 'email, password, name은 필수입력 항목입니다.' });
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
//
router.post('/login', async (req, res) => {
    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해주세요.' });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: '유효하지 않은 이메일 형식입니다.' });
    }
    try {}
    catch(e) {
        console.error(e);
        return res.status(500).json({message: '~~~'})
    }
})
module.exports = router;