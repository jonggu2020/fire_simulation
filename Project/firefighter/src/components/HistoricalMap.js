import React from 'react';

const HistoryList = ({ history, onHistoryClick, isLoggedIn }) => {
    const listStyle = {
        position: 'fixed', // ✅ 화면 기준으로 위치를 고정합니다.
        bottom: '20px',      // ✅ 화면 아래쪽에서 20px 위에 위치시킵니다.
        left: '1425px',
        zIndex: 1001,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '0',
        borderRadius: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        width: '250px',
        maxHeight: '220px', // ✅ 최대 높이를 조금 줄여서 다른 UI와 겹치지 않게 조절
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    };

    const headerStyle = {
        backgroundColor: '#ef4444',
        color: 'white',
        padding: '8px 15px',
        margin: 0,
        fontWeight: 'normal',
        flexShrink: 0 // ✅ 헤더는 줄어들지 않도록 설정
    };
    
    // ✅ 내용(컨텐츠) 부분 스타일을 따로 정의합니다.
    const contentStyle = {
        padding: '10px 15px',
        overflowY: 'auto', // ✅ 내용이 많아지면 여기서 세로 스크롤이 생깁니다.
        flexGrow: 1
    };

    const itemStyle = {
        padding: '8px 5px',
        cursor: 'pointer',
        borderBottom: '1px solid #eee'
    };

    const messageStyle = {
        textAlign: 'center',
        padding: '20px 0',
        color: '#555'
    };

    return (
        <div style={listStyle}>
            <h4 style={headerStyle}> 내 시뮬레이션 내역</h4>

            <div style={contentStyle}>
                {!isLoggedIn ? (
                    <p style={messageStyle}>로그인이 필요한 기능입니다.</p>
                ) : history && history.length > 0 ? (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {history.map(item => (
                            <li 
                                key={item.id} 
                                style={itemStyle}
                                onClick={() => onHistoryClick(item)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {item.title}
                                <span style={{ fontSize: '0.8em', color: '#777', display: 'block' }}>
                                    {item.createdAt && item.createdAt.seconds ? 
                                        new Date(item.createdAt.seconds * 1000).toLocaleString() : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p style={messageStyle}>저장된 내역이 없습니다.</p>
                )}
            </div>
        </div>
    );
};

export default HistoryList;
