// src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css'; // App 컴포넌트의 스타일 파일 (기본 생성됨)
import logo from './assets/firefighter_logo.png';

// --- 수정 전 ---
// import VWorldMap from './VWorldMap'; // 우리가 만든 VWorldMap 컴포넌트를 불러옵니다.

// --- 수정 후 ---
// VWorldMap 컴포넌트의 새 위치를 정확히 지정합니다.
import VWorldMap from './components/VWorldMap';
import Home from './components/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1) 홈 페이지 라우트 */}
        <Route path="/" element={<HomePage />} />

        {/* 2) 지도 페이지 라우트 */}
        <Route path="/map" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  );
}

// 1. HomePage: 로고 좌측, 텍스트 중앙
const HomePage = () => {
  // const navigate = useNavigate();
  return (
    <div className="App" style={{display: 'flex', flexDirection: 'column', height: '105vh', backgroundColor: '#F5F5F5',}}>
      {/* Home 전용 헤더 */}
      <header
        style={{
          display: 'flex',
          height: '80px',
          alignItems: 'center',
          justifyContent: 'center',  // 텍스트 가운데
          padding: '10px 20px',
          backgroundColor: '#f0f0f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          borderBottom: '2px solid #9c9c9c',
        }}
      >
        <img
          src={logo}
          alt="FireFighter Logo"
          style={{ height: '105px', width: '115px', marginRight: '12px', position: 'absolute', left: '30px' }}
        />
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold' }}>
          <span style={{ color: '#B33E2C' }}>F</span>ireFighter
        </h1>
      </header>

      {/* Home 컴포넌트 */}
      <div
        style={{
          flexGrow: 1,
          paddingTop: '80px',    // ← 여기!
          overflow: 'auto'
        }}
      >
        <Home />
      </div>

      {/* Home에서 “시작하기” 버튼 누르면 /map 으로 이동 */}
      {/* Home 내부에 이미 useNavigate 로 버튼 처리되어 있다면 여기선 생략해도 됩니다 */}
    </div>
  );
};

// 2. MapPage: 로고 좌측, 텍스트 좌측
const MapPage = () => (
  <div className="App">
    {/* 페이지 제목 헤더 (선택 사항) */}
    <header
      style={{
        backgroundColor: '#f0f0f0',
        height: '50px',            // 높이 증가
        padding: '5px 10px',         // 상하좌우 패딩
        display: 'flex',           // 수직 가운데 정렬
        alignItems: 'flex-end',   // 헤더 하단 정렬
        justifyContent: 'flex-start',  // 텍스트 좌측 정렬
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

      {/* ④ 텍스트: 첫 글자만 빨강 */}
      <h1 style={{ margin: 0, fontSize: '1.3rem', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
        <span style={{ color: '#B33E2C' }}>F</span>ireFighter
      </h1>
    </header>

    {/* VWorldMap 컴포넌트를 렌더링합니다. */}
    {/* VWorldMap 컴포넌트 내부에서 지도가 생성되어 해당 div 안에 표시됩니다. */}
    {/* VWorldMap 자체에 flexbox 스타일을 주어 헤더/푸터 외 남은 공간을 사용하게 했습니다. */}
      <VWorldMap />

  </div>
);

export default App; // App 컴포넌트를 내보냅니다.