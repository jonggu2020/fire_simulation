import React from 'react';

const FavoritesList = ({ favorites, onFavoriteClick }) => {
    const listStyle = {
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1001,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px 15px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        width: '250px',
        maxHeight: '300px',
        overflowY: 'auto'
    };

    const itemStyle = {
        padding: '8px 5px',
        cursor: 'pointer',
        borderBottom: '1px solid #eee'
    };

    if (!favorites || favorites.length === 0) {
        return null; // 즐겨찾기가 없으면 아무것도 표시하지 않음
    }

    return (
        <div style={listStyle}>
            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>⭐ 즐겨찾는 관측소</h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {favorites.map(fav => (
                    <li 
                        key={fav.stationId} 
                        style={itemStyle}
                        onClick={() => onFavoriteClick(fav)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {fav.stationName}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FavoritesList;