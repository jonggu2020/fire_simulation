import axios from 'axios';

/**
 * @file historyApiService.js
 * @description 프론트엔드에서 백엔드 API와 통신하여 시뮬레이션 내역 데이터를 관리하는 함수들을 정의합니다.
 */

// ✅ [수정] 하드코딩된 IP 주소를 제거하고 상대 경로를 사용하도록 변경합니다.
// 이렇게 하면 React의 프록시 설정을 통해 API 요청이 전달됩니다.
const API_BASE_URL = '/api';

/**
 * 완료된 시뮬레이션 결과를 서버에 저장합니다.
 * @param {object} data - 저장할 시뮬레이션 데이터.
 * @param {string} data.title - 시뮬레이션 제목.
 * @param {string} data.imageUrl - Firebase Storage에 저장된 이미지 URL.
 * @param {object} data.simulationData - 시뮬레이션 결과 원본 데이터.
 * @param {string} idToken - 사용자의 인증을 위한 Firebase ID 토큰.
 * @returns {Promise<object>} 저장 성공 관련 메시지를 담은 객체를 반환하는 Promise.
 * @throws {Error} API 요청이 실패했을 때 에러를 발생시킵니다.
 */
export const saveHistory = async (data, idToken) => {
    // API_BASE_URL이 상대 경로로 변경됨에 따라 URL 구성 방식도 수정합니다.
    const response = await axios.post(`${API_BASE_URL}/history`, data, {
        headers: { 'Authorization': `Bearer ${idToken}` }
    });
    return response.data;
};

/**
 * 현재 로그인된 사용자의 모든 시뮬레이션 내역을 서버에서 가져옵니다.
 * @param {string} idToken - 사용자의 인증을 위한 Firebase ID 토큰.
 * @returns {Promise<Array>} 시뮬레이션 내역 목록을 담은 배열을 반환하는 Promise.
 * @throws {Error} API 요청이 실패했을 때 에러를 발생시킵니다.
 */
export const getHistory = async (idToken) => {
    const response = await axios.get(`${API_BASE_URL}/history`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
    });
    return response.data;
};
