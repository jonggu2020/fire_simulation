// src/components/weatherService.js (신규 파일)

import { database } from '../firebaseConfig'; // firebaseConfig.js의 경로가 맞는지 확인해주세요.
import { ref, onValue, off } from 'firebase/database';

/**
 * Firebase Realtime Database로부터 특정 지점의 날씨 정보를 실시간으로 가져옵니다.
 * @param {string} obsid - 관측 지점 번호 (예: '1910')
 * @param {function} callback - 데이터 수신 시 호출될 콜백 함수 (weatherData, error)
 * @returns {function} Firebase 리스너를 해제하는 함수
 */
export const subscribeToStationWeather = (obsid, callback) => {
  // Firebase에 데이터가 저장될 것으로 예상되는 경로 (예: /weatherdata/1910)
  const weatherDataRef = ref(database, `weatherdata/${obsid}`);

  const listener = onValue(weatherDataRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data, null); // 데이터와 함께 에러는 null
    } else {
      // 데이터가 없을 경우
      callback(null, null); 
    }
  }, (error) => {
    console.error("Firebase 데이터 수신 오류 (obsid: " + obsid + "):", error);
    callback(null, error); // 에러 객체 전달
  });

  // 리스너 해제 함수 반환
  return () => {
    off(weatherDataRef, 'value', listener);
  };
};