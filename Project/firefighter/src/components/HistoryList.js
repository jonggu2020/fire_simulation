import React from 'react';

// ✅ [수정] onHistoryClick 함수를 props로 받습니다.
const HistoryList = ({ history, onHistoryClick, isLoggedIn }) => {
    const listStyle = {
        position: 'absolute',
        top: '480px',
        left: '20px',
        zIndex: 1001,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px 15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        width: '250px',
        minHeight: '100px',
        maxHeight: '400px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
    };

    const itemStyle = {
        padding: '8px 5px',
        cursor: 'pointer',
        borderBottom: '1px solid #eee'
    };

    const messageStyle = {
        textAlign: 'center',
        margin: 'auto',
        color: '#555'
    };

    return (
        <div style={listStyle}>
            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>🕒 내 시뮬레이션 내역</h4>
            {!isLoggedIn ? (
                <p style={messageStyle}>로그인이 필요한 기능입니다.</p>
            ) : history && history.length > 0 ? (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {history.map(item => (
                        <li 
                            key={item.id} 
                            style={itemStyle}
                            // ✅ [수정] 클릭 시 onHistoryClick 함수를 호출하고, 전체 item 객체를 전달합니다.
                            onClick={() => onHistoryClick(item)}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {item.title}
                            <span style={{ fontSize: '0.8em', color: '#777', display: 'block' }}>
                                {/* Firestore 타임스탬프 객체(seconds, nanoseconds)를 올바르게 처리합니다. */}
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
    );
};

export default HistoryList;
