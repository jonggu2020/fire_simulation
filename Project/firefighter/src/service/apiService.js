import axios from 'axios';

/**
 * 현재 사용자의 즐겨찾기 목록을 가져옵니다.
 * @param {string} idToken - Firebase ID 토큰
 */
export const getFavorites = async (idToken) => {
    const response = await axios.get('/api/favorites', {
        headers: { 'Authorization': `Bearer ${idToken}` }
    });
    return response.data;
};

/**
 * 즐겨찾기를 추가합니다.
 * @param {object} station - 관측소 정보 객체
 * @param {string} idToken - Firebase ID 토큰
 */
export const addFavorite = async (station, idToken) => {
    const response = await axios.post('/api/favorites', 
        { 
            stationId: station.obsid, 
            stationName: station.name,
            lat: station.latitude,
            lon: station.longitude
        },
        { headers: { 'Authorization': `Bearer ${idToken}` } }
    );
    return response.data;
};

/**
 * 즐겨찾기를 삭제합니다.
 * @param {string} stationId - 관측소 ID
 * @param {string} idToken - Firebase ID 토큰
 */
export const removeFavorite = async (stationId, idToken) => {
    const response = await axios.delete(`/api/favorites/${stationId}`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
    });
    return response.data;
};