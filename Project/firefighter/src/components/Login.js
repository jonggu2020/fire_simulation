// src/components/Login.js

import React, { useState } from "react";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";
import logoImage from "../assets/firefighter_logo.png";

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      await axios.post('/api/auth/login', { token: idToken });
      setMessage('로그인 성공! 잠시 후 메인 페이지로 이동합니다.');

      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error("로그인 에러:", error);
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

  const handleSignUpClick = () => {
    navigate('/signup');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div className="login-container">
      <div className="login-logo" onClick={handleLogoClick}>
        <img src={logoImage} alt="Fire Icon" />
        <div className="login-logo-title"><span>F</span>ireFighter</div>
      </div>

      <form onSubmit={handleLogin} className="login-form">
        <div className="login-form-group">
          <label htmlFor="email" className="login-label">이메일</label>
          <input
            type="email"
            id="email"
            value={email}
            className="login-input"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="login-form-group">
          <label htmlFor="password" className="login-label">비밀번호</label>
          <input
            type="password"
            id="password"
            value={password}
            className="login-input"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="login-submit-button">로그인</button>
      </form>

      <button onClick={handleSignUpClick} className="login-signup-button">회원가입</button>

      {error && <p className="login-error-text">에러: {error}</p>}
      {message && <p className="login-success-text">{message}</p>}
    </div>
  );
}

export default Login;
