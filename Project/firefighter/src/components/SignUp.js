import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();
        const auth = getAuth();
        setError(null);
        setMessage('');
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            setMessage('회원가입 성공! 로그인 페이지로 이동합니다.');
            setTimeout(() => {
                navigate('/login');
            }, 2000); // 2초 후 로그인 페이지로 이동
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div>
            <h2>회원가입</h2>
            <form onSubmit={handleSignUp}>
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
                        placeholder="비밀번호 (6자 이상)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">회원가입</button>
            </form>
            {error && <p style={{ color: 'red' }}>에러: {error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}
        </div>
    );
}

export default SignUp;
