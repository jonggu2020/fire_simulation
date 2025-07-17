import axios from 'axios';
/**
 * @file apiService.js
 * @description 프론트 쪽에서 백엔드 API와 통신하여 즐겨찾기 데이터를 관리하는 함수들을 정의합니다.
 */

/**
 * 현재 로그인된 사용자의 즐겨찾기 목록을 서버에서 가져옵니다.
 * @param {string} idToken - 사용자의 인증을 위한 Firebase ID 토큰.
 * @returns {Promise<Array>} 즐겨찾기 목록을 담은 배열을 반환하는 Promise.
 * @throws {Error} API 요청이 실패했을 때 에러를 발생시킵니다.
 */
export const getFavorites = async (idToken) => {
    const response = await axios.get('/api/favorites', {
        headers: { 'Authorization': `Bearer ${idToken}` }
    });
    return response.data;
};

/**
 * 새로운 관측소를 사용자의 즐겨찾기에 추가합니다.
 * @param {object} station - 추가할 관측소의 상세 정보.
 * @param {string} station.obsid - 관측소 고유 ID.
 * @param {string} station.name - 관측소 이름.
 * @param {number} station.latitude - 관측소 위도.
 * @param {number} station.longitude - 관측소 경도.
 * @param {string} idToken - 사용자의 인증을 위한 Firebase ID 토큰.
 * @returns {Promise<object>} 추가된 즐겨찾기 정보를 반환하는 Promise.
 * @throws {Error} API 요청이 실패했을 때 에러를 발생시킵니다.
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
 * 사용자의 즐겨찾기에서 특정 관측소를 삭제합니다.(임시)
 * @param {string} stationId - 삭제할 관측소의 고유 ID.
 * @param {string} idToken - 사용자의 인증을 위한 Firebase ID 토큰.
 * @returns {Promise<object>} 삭제 성공 관련 메시지를 담은 객체를 반환하는 Promise.
 * @throws {Error} API 요청이 실패했을 때 에러를 발생시킵니다.
 */
export const removeFavorite = async (stationId, idToken) => {
    const response = await axios.delete(`/api/favorites/${stationId}`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
    });
    return response.data;
};