// src/components/SignUp.js
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import './SignUp.css'; // ✅ css 연결
import logo from '../assets/firefighter_logo.png';

function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccessMessage('회원가입이 완료되었습니다.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-wrapper">
        <div className="signup-header">
          <img src={logo} alt="FireFighter Logo" className="signup-logo" />
          <h2 className="signup-title">
            <span className="red-F">F</span>ireFighter
          </h2>
        </div>
        

        <form className="signup-form" onSubmit={handleSignUp}>
          <label htmlFor="name" className="signup-label">이름</label>
          <input
            id="name"
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="signup-input"
            required
          />

          <label htmlFor="email" className="signup-label">이메일</label>
          <input
            id="email"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="signup-input"
            required
          />

          <label htmlFor="password" className="signup-label">비밀번호</label>
          <input
            id="password"
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="signup-input"
            required
          />

          <button type="submit" className="signup-button">회원가입</button>
        </form>

        {successMessage && <p className="signup-success">{successMessage}</p>}
        {error && <p className="signup-error">{error}</p>}
      </div>
    </div>
  );
}

export default SignUp;
