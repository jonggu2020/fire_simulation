/**
 * src/App.js
 * 애플리케이션의 메인 컴포넌트입니다.
 * React Router를 사용하여 페이지 간의 라우팅을 관리합니다.
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import './App.css';
import logo from './assets/firefighter_logo.png';
import { useAuthState } from 'react-firebase-hooks/auth';

// 페이지 컴포넌트 import
import VWorldMap from './components/VWorldMap';
import Home from './components/Home';
import Login from './components/Login';
import SignUp from './components/SignUp';
import HistoricalMap from './components/HistoricalMap';

// [추가] 공통 스타일 객체 정의
const headerStyle = {
  display: 'flex',
  height: '65px',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '5px 20px',
  backgroundColor: '#f0f0f0',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  borderBottom: '2px solid #9c9c9c',
};

const logoStyle = {
  height: '105px',
  width: '115px',
  marginRight: '12px',
};

const titleStyle = {
  margin: 0,
  fontSize: '2.5rem',
  fontWeight: 'bold',
  color: 'black',
};

const buttonStyle = {
  padding: '10px 20px',
  fontSize: '1rem',
  color: 'White',
  backgroundColor: '#ef4444',
  border: '1px solid #ccc',
  borderRadius: '5px',
  cursor: 'pointer',
  borderBottom: '2px solid #ddd'
};



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
      {/* [수정] 공통 스타일 적용 */}
      <header style={headerStyle}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src={logo}
            alt="FireFighter Logo"
            style={logoStyle}
          />
          <h1 style={titleStyle}>
            <span style={{ color: '#B33E2C' }}>F</span>ireFighter
          </h1>
        </Link>
        {user ? (
          // [수정] 공통 버튼 스타일 적용
          <button onClick={handleLogoutClick} style={buttonStyle}>
            로그아웃
          </button>
        ) : (
          // [수정] 공통 버튼 스타일 적용
          <button onClick={handleLoginClick} style={buttonStyle}>
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
const MapPage = () => {
    const [user] = useAuthState(auth);
    const navigate = useNavigate();

    const handleLogin = () => {
        navigate("/login");
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            alert('로그아웃 되었습니다.');
        } catch (error) {
            console.error("로그아웃 오류:", error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }
    };
    
    return (
        <div className="App">
            {/* [수정] 공통 헤더 스타일 적용 */}
            <header style={headerStyle}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    <img
                      src={logo}
                      alt="FireFighter Logo"
                      style={logoStyle}
                    />
                    <h1 style={titleStyle}>
                      <span style={{ color: '#B33E2C' }}>F</span>ireFighter
                    </h1>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {user ? (
                    <>
                        <span style={{ fontWeight: 'bold' }}>{user.displayName}님 환영합니다.</span>
                        {/* [수정] 공통 버튼 스타일 적용 */}
                        <button onClick={handleLogout} style={buttonStyle}>
                            로그아웃
                        </button>
                    </>
                ) : (
                    // [수정] 공통 버튼 스타일 적용
                    <button onClick={handleLogin} style={buttonStyle}>
                        로그인
                    </button>
                )}
                </div>
            </header>
            <VWorldMap />
        </div>
    );
};

export default App;
