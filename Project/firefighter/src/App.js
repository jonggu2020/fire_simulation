/**
 * src/App.js
 * 
 * 애플리케이션의 메인 컴포넌트입니다.
 * React Router를 사용하여 페이지 간의 라우팅을 관리합니다.
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import './App.css';
import logo from './assets/firefighter_logo.png';

// 페이지 컴포넌트 import
import VWorldMap from './components/VWorldMap';
import Home from './components/Home';
import Login from './components/Login';
import SignUp from './components/SignUp';
import HistoricalMap from './components/HistoricalMap';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/historical" element={<HistoricalMap />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * 홈 페이지 컴포넌트
 */
const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleLogoutClick = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', height: '105vh', backgroundColor: '#F5F5F5' }}>
      <header
        style={{
          display: 'flex',
          height: '80px',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 30px',
          backgroundColor: '#f0f0f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          borderBottom: '2px solid #9c9c9c',
        }}
      >
        {/* 🔗 로고 클릭 시 홈으로 이동 */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src={logo}
            alt="FireFighter Logo"
            style={{ height: '105px', width: '115px', marginRight: '12px' }}
          />
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', color: 'black' }}>
            <span style={{ color: '#B33E2C' }}>F</span>ireFighter
          </h1>
        </Link>

        {user ? (
          <button
            onClick={handleLogoutClick}
            style={{
              padding: '10px 20px',
              fontSize: '1rem',
              color: 'white',
              backgroundColor: '#B33E2C',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            로그아웃
          </button>
        ) : (
          <button
            onClick={handleLoginClick}
            style={{
              padding: '10px 20px',
              fontSize: '1rem',
              color: 'white',
              backgroundColor: '#B33E2C',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            로그인
          </button>
        )}
      </header>

      <div style={{ flexGrow: 1, paddingTop: '80px', overflow: 'auto' }}>
        <Home />
      </div>
    </div>
  );
};

/**
 * 지도 페이지 컴포넌트
 */
const MapPage = () => (
  <div className="App">
    <header
      style={{
        backgroundColor: '#f0f0f0',
        height: '50px',
        padding: '5px 10px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        color: '#333',
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        borderBottom: '2px solid #9c9c9c',
      }}
    >
      {/* 🔗 로고 클릭 시 홈으로 이동 */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <img
          src={logo}
          alt="FireFighter Logo"
          style={{ height: '60px', marginRight: '6px' }}
        />
        <h1 style={{
          margin: 0,
          fontSize: '1.3rem',
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color: 'black'
        }}>
          <span style={{ color: '#B33E2C' }}>F</span>ireFighter
        </h1>
      </Link>
    </header>

    <VWorldMap />
  </div>
);

export default App;
