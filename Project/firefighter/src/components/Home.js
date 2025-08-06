// src/components/Home.js
import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 광고용 이미지 3장 import
import banner1 from '../assets/banner1.jpg';
import banner2 from '../assets/banner2.jpg';
import banner3 from '../assets/banner3.jpg';

const Home = () => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const bannerRefs = useRef([]);

  useEffect(() => {
    const id = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(id);
  }, []);

  const overlayMessages = [
    '건조한 계절, 작은 불씨도 대형 화재로',
    '산불은 무시무시한 자연의 적입니다',
    '산불 발생 즉시 119에 신고하세요'
  ];

  const styles = {
    page: {
      backgroundColor: '#F5F5F5',
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0 20px',
      boxSizing: 'border-box',
    },
    title: {
        fontSize: '1.2rem',
        color: '#827777',
        marginBottom: '20px',
        textAlign: 'center',
        marginTop: '30px',
      },
    bannerContainer: {
      display: 'flex',
      gap: '80px',
      marginBottom: '40px',
    },
    bannerWrapper: {
      position: 'relative',
      width: '400px',
      height: '480px',
      cursor: 'pointer',
      overflow: 'hidden',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    },
    bannerImage: {
      width: '400px',
      height: '480px',
      objectFit: 'cover',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      opacity: loaded ? 1 : 0.4,             
      transition: 'opacity 1.2s ease-in',
    },
    overlayText: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: 'white',
      fontSize: '1rem',
      fontWeight: 'bold',
      textAlign: 'center',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    },
    buttonContainer: { // ✅ [추가] 버튼들을 감싸는 컨테이너
        display: 'flex',
        gap: '20px',
        marginTop: '80px',
    },
    button: {
      padding: '16px 80px',
      fontSize: '1.4rem',
      fontWeight: 'bold',
      minWidth: '200px',
      height: 'auto',
      cursor: 'pointer',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#EB5C42',
      color: 'white',
      transition: 'background-color 0.2s ease',
    },
    secondaryButton: { // ✅ [추가] 새로운 버튼을 위한 스타일
        backgroundColor: '#6c757d',
    }
  };

  const banners = [banner1, banner2, banner3];

  return (
    <div style={styles.page}>
      <div style={styles.bannerContainer}>
        {banners.map((src, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <div
              key={i}
              style={styles.bannerWrapper}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => navigate('/map')}
            >
              <img
                ref={el => (bannerRefs.current[i] = el)}
                src={src}
                alt={`배너${i + 1}`}
                style={{
                  ...styles.bannerImage,
                  filter: isHovered ? 'brightness(50%)' : 'none'
                }}
              />
              {isHovered && (
                <div style={styles.overlayText}>
                  {overlayMessages[i]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h1 style={styles.title}>
        이 사이트는 산불 피해 경로를 예측할 수 있습니다<br/>
        사용자가 원하는 위치의 피해경로를 예측해보세요
      </h1>

      {/* ✅ [수정] 버튼들을 컨테이너로 감싸고 새 버튼을 추가합니다. */}
      <div style={styles.buttonContainer}>
        <button
            style={styles.button}
            onClick={() => navigate('/map')}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#a33')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#EB5C42')}
        >
            예측 시뮬레이션
        </button>
        <button
            style={{...styles.button, ...styles.secondaryButton}}
            onClick={() => navigate('/historical')}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5a6268')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#6c757d')}
        >
            과거 산불사례
        </button>
      </div>
    </div>
  );
};

export default Home;
