const express = require('express');
const router = express.Router();
const { firestore } = require('../firebaseAdmin');

// POST / 요청을 처리하는 라우터입니다.
// 클라이언트로부터 시뮬레이션 결과(제목, 이미지 URL, 데이터)를 받아 Firestore에 저장합니다.
router.post('/', async (req, res) => {
    // 1. 요청 본문(body)에서 title, imageUrl, simulationData 값을 구조 분해 할당으로 추출합니다.
    const { title, imageUrl, simulationData } = req.body;
    // 2. 요청 객체(req)에 포함된 사용자 정보(미들웨어 등을 통해 인증된)에서 userId를 추출합니다.
    const userId = req.user.uid;

    // 3. 필수 데이터 검증: 요청에 필요한 모든 필드가 있는지 확인합니다.
    // 하나라도 누락된 경우, 400 Bad Request 상태 코드와 에러 메시지를 JSON 형식으로 응답합니다.
    if (!userId || !title || !imageUrl || !simulationData) {
        return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    // 4. 데이터베이스 작업을 위한 try-catch 블록
    try {
        // 5. Firestore에 데이터 저장
        // 'users' 컬렉션 -> 특정 'userId' 문서 -> 'history' 하위 컬렉션에 새로운 문서를 추가합니다.
        const docRef = await firestore.collection('users').doc(userId).collection('history').add({
            title,          // 시뮬레이션 제목
            imageUrl,       // Firebase Storage에 저장된 이미지의 다운로드 URL
            simulationData, // 시뮬레이션에 사용된 상세 데이터
            createdAt: new Date() // 서버 현재 시간을 기준으로 생성 시간 기록
        });

        // 6. 성공 응답 전송
        // 데이터가 성공적으로 생성되었음을 의미하는 201 Created 상태 코드와 함께
        // 성공 메시지 및 새로 생성된 문서의 ID를 클라이언트에 응답합니다.
        res.status(201).json({ message: '시뮬레이션 내역이 저장되었습니다.', id: docRef.id });

    } catch (error) {
        // 7. 에러 처리
        // Firestore 저장 과정에서 오류가 발생하면 콘솔에 에러를 출력하여 디버깅에 사용합니다.
        console.error('Firestore 저장 오류:', error);
        // 클라이언트에는 서버 내부 오류가 발생했음을 알리는 500 Internal Server Error 상태 코드와 에러 메시지를 응답합니다.
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
