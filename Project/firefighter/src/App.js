/**
 * src/App.js
 * 
 * 애플리케이션의 메인 컴포넌트입니다.
 * React Router를 사용하여 페이지 간의 라우팅을 관리합니다.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css'; // 전역 CSS 스타일
import logo from './assets/firefighter_logo.png'; // 로고 이미지

// 페이지 컴포넌트 import
import VWorldMap from './components/VWorldMap';
import Home from './components/Home';
import Login from './components/Login';
import SignUp from './components/SignUp';


// ✅ [추가] 새로 만든 HistoricalMap 컴포넌트를 가져옵니다.
import HistoricalMap from './components/HistoricalMap';

/**
 * App 컴포넌트
 * 
 * @returns {JSX.Element}
 * - BrowserRouter: HTML5 히스토리 API를 사용하여 UI와 URL을 동기화합니다.
 * - Routes: Route 컴포넌트들을 감싸고, 현재 URL에 맞는 첫 번째 Route를 렌더링합니다.
 * - Route: 특정 경로에 어떤 컴포넌트를 렌더링할지 정의합니다.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 홈 페이지 라우트 */}
        <Route path="/" element={<HomePage />} />

        {/* 지도 페이지 라우트 */}
        <Route path="/map" element={<MapPage />} />

        {/* 로그인 페이지 라우트 */}
        <Route path="/login" element={<Login />} />
        
        {/* 회원가입 페이지 라우트 */}
        <Route path="/signup" element={<SignUp />} />  

        {/* ✅ [추가] '/historical' 경로에 HistoricalMap 컴포넌트를 연결합니다. */}
        <Route path="/historical" element={<HistoricalMap />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * HomePage 컴포넌트
 * 애플리케이션의 메인 페이지입니다.
 * 헤더, Home 컴포넌트, 로그인 버튼이 있습니다.
 */
const HomePage = () => {
  const navigate = useNavigate(); // 페이지 이동을 위한 navigate 함수??

  // 로그인 버튼 클릭 시 /login 경로로 이동하는 함수?
  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="App" style={{display: 'flex', flexDirection: 'column', height: '105vh', backgroundColor: '#F5F5F5',}}>
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={logo}
            alt="FireFighter Logo"
            style={{ height: '105px', width: '115px', marginRight: '12px' }}
          />
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>
            <span style={{ color: '#B33E2C' }}>F</span>ireFighter
          </h1>
        </div>
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
      </header>
      <div
        style={{
          flexGrow: 1,
          paddingTop: '80px',
          overflow: 'auto'
        }}
      >
        <Home />
      </div>
    </div>
  );
};

/**
 * MapPage 컴포넌트
 * VWorldMap 지도를 보여주는 페이지입니다.
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
      <img
        src={logo}
        alt="FireFighter Logo"
        style={{ height: '60px', marginRight: '6px' }}
      />
      <h1 style={{ margin: 0, fontSize: '1.3rem', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
        <span style={{ color: '#B33E2C' }}>F</span>ireFighter
      </h1>
    </header>

    <VWorldMap />
  </div>
);

export default App;