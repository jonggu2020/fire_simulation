const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const pool = require('../config/db');
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
    // 1. 필수 입력 항목 검사
    if (!email || !password || !name) {
            return res.status(400).json({ message: 'email, password, name은 필수입력 항목입니다.' });
    }
    // 2. validator 라이브러리를 이용하여 email 형식 검사
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: '유효하지 않은 이메일 형식입니다.' });
    }
    // 3. 사용자 등록 로직
    try {
        // 사용자 등록 로직 추가 예정
        return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    }
    catch(e) {
        console.error(e);
        return res.status(500).json({message: '~~~'})
    }
});
//
router.post('/login', async (req, res) => {
    // 1. 필수 입력 항목 검사
    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해주세요.' });
    }
    // 2. email 형식 검사
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: '유효하지 않은 이메일 형식입니다.' });
    }
    // 3. 유저 정보 확인
    try {}
    catch(e) {
        console.error(e);
        return res.status(500).json({message: '~~~'})
    }
})
module.exports = router;