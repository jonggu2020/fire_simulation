import React from 'react';

const HistoryList = ({ history, onHistoryClick, isLoggedIn, onDeleteHistory }) => {
    const listStyle = {
        position: 'absolute',
        top: '780px',
        right: '40px',
        zIndex: 1001,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '0',
        borderRadius: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        width: '250px',
        maxHeight: '400px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
    };

    const headerStyle = {
        backgroundColor: '#ef4444',
        color: 'white',
        padding: '8px 15px',
        margin: 0,
        ontWeight: 'normal', 
        borderBottom: '1px solid #ddd'
    };



    const itemStyle = {
        padding: '8px 15px',
        cursor: 'pointer',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const deleteButtonStyle = {
        backgroundColor: 'transparent',
        color: '#555',
        border: 'none',
        borderRadius: '0',
        width: 'auto',
        height: 'auto',
        cursor: 'pointer',
        fontSize: '14px',
        lineHeight: '1',
        textAlign: 'center',
        marginLeft: '10px',
        padding: '0px 5px'
    };

    const messageStyle = {
        textAlign: 'center',
        padding: '20px 0',
        color: '#555'
    };

    return (
        <div style={listStyle}>
            <h4 style={headerStyle}>내 시뮬레이션 내역</h4>
            
            <div style={{ overflowY: 'auto', flexGrow: 1 }}>
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
                                <div>
                                    {item.title}
                                    <span style={{ fontSize: '0.8em', color: '#777', display: 'block' }}>
                                        {item.createdAt && item.createdAt.seconds ? 
                                            new Date(item.createdAt.seconds * 1000).toLocaleString() : ''}
                                    </span>
                                </div>
                                
                                <button
                                    style={deleteButtonStyle}
                                    title="이 내역 삭제"
                                    onClick={(e) => {
                                        e.stopPropagation(); 
                                        onDeleteHistory(item.id);
                                    }}
                                >
                                    X
                                </button>
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
