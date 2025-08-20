// firefighter/src/components/FavoritesList.js

const FavoritesList = ({ favorites, onFavoriteClick, isLoggedIn }) => {
    const listStyle = {
        position: 'absolute',
        top: '600px',
        right: '40px',
        zIndex: 1001,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '0',
        borderRadius: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        width: '250px',
        // minHeight: '100px',  // ✅ [제거] 최소 높이를 제거해서 내용에 맞게 크기 조절
        maxHeight: '300px',
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
            <h4 style={headerStyle}> 즐겨찾는 관측소</h4>
            
            <div style={{ padding: '10px 15px', overflowY: 'auto', flexGrow: 1 }}>
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
        </div>
    );
};

export default FavoritesList;
