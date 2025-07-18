// firefighter/src/components/FavoritesList.js
// 즐겨찾기 한 관측소 목록을 가져오는 컴포넌트 입니다

const FavoritesList = ({ favorites, onFavoriteClick, isLoggedIn }) => {
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
        minHeight: '100px', 
        maxHeight: '300px',
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
        margin: 'auto', // 수직 및 수평 중앙 정렬
        color: '#555'
    };

    return (
        <div style={listStyle}>
            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>⭐ 즐겨찾는 관측소</h4>
            {!isLoggedIn ? (
                <p style={messageStyle}>로그인이 필요한 기능입니다.</p>
            ) : favorites && favorites.length > 0 ? (
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
            ) : (
                <p style={messageStyle}>즐겨찾는 관측소가 없습니다.</p>
            )}
        </div>
    );
};

export default FavoritesList;