/**
 * src/components/Login.js
 * 로그인 페이지 컴포넌트입니다.
 * Firebase Authentication을 사용하여 이메일과 비밀번호로 로그인합니다.
 */

import React, { useState } from "react";
// firebaseConfig에서 auth 객체를 직접 import 합니다.
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Login() {
    // 이메일, 비밀번호, 에러, 성공 메시지를 위한 state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    /**
     * 로그인 폼 제출 핸들러
     * @param {React.FormEvent<HTMLFormElement>} e - 폼 이벤트 객체
     */
    const handleLogin = async (e) => {
        e.preventDefault(); // 폼의 기본 제출 동작 방지
        setError(null); // 이전 에러 메시지 초기화
        setMessage(''); // 이전 성공 메시지 초기화

        try {
            // Firebase를 사용하여 이메일과 비밀번호로 로그인 시도
            // import한 auth 사용합니다.
            await signInWithEmailAndPassword(auth, email, password);
            setMessage('로그인 성공!');
            
            // 1.5초 후 메인 페이지('/')로 이동
            setTimeout(() => {
                navigate('/');
            }, 1500);

        } catch (error) {
            // 로그인 실패 시 에러 메시지 설정
            setError(error.message);
        }
    };

    // 회원가입 버튼 클릭 시 /signup 경로로 이동하는 함수
    const handleSignUpClick = () => {
        navigate('/signup');
    };

    return (
        <div>
            <h2>로그인</h2>
            <form onSubmit={handleLogin}>
                <div>
                    <label htmlFor="email">이메일:</label>
                    <input
                        type="email"
                        id="email"
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password">비밀번호:</label>
                    <input
                        type="password"
                        id="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">로그인</button>
            </form>
            <button onClick={handleSignUpClick} style={{ marginTop: '10px' }}>회원가입</button>
            
            {/* 에러 또는 성공 메시지 표시 */}
            {error && <p style={{ color: 'red' }}>에러: {error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}
        </div>
    );
}

export default Login;