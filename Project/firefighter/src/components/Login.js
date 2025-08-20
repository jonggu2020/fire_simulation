/**
 * src/components/Login.js
 * 로그인 페이지 컴포넌트입니다.
 * Firebase Authentication을 사용하여 이메일과 비밀번호로 로그인합니다.
 */
import React, { useState } from "react";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import axios from 'axios';

function Login() {
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
        e.preventDefault();
        setError(null);
        setMessage('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const idToken = await user.getIdToken();
            console.log("발급된 Firebase ID 토큰:", idToken);

            await axios.post('/api/auth/login', { token: idToken });
            
            // (선택사항) 백엔드에 로그인 사실을 알리거나 사용자 정보를 저장할 수 있습니다.
            // 예시: await api.post('/auth/login', { token: idToken });

            setMessage('로그인 성공! 잠시 후 메인 페이지로 이동합니다.');

            setTimeout(() => {
                navigate('/');
            }, 1500);

        } catch (error) {
            console.error("Firebase에서 받은 실제 오류:", error);
            let errorMessage = "로그인에 실패했습니다. 다시 시도해주세요.";
            switch (error.code) {
                case "auth/user-not-found":
                case "auth/invalid-credential":
                    errorMessage = "등록되지 않은 이메일이거나 비밀번호가 틀렸습니다.";
                    break;
                case "auth/invalid-email":
                    errorMessage = "유효하지 않은 이메일 형식입니다.";
                    break;
            }
            setError(errorMessage);
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