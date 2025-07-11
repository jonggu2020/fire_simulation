/**
 * src/components/SignUp.js
 * 
 * 회원가입 페이지 컴포넌트입니다.
 * Firebase Authentication을 사용하여 새로운 사용자를 생성합니다.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function SignUp() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage('');

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '회원가입에 실패했습니다.');
            }

            setMessage('회원가입 성공! 로그인 페이지로 이동합니다.');

            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div>
            <h2>회원가입</h2>
            <form onSubmit={handleSignUp}>
                <div>
                    <label htmlFor="name">이름:</label>
                    <input
                        type="text"
                        id="name"
                        placeholder="이름"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
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

            {/* 에러 또는 성공 메시지 표시 */}
            {error && <p style={{ color: 'red' }}>에러: {error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}
        </div>
    );
}

export default SignUp;