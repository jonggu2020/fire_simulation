// backend/populateFuelRatings.js

require('dotenv').config();

const turf = require('@turf/turf');
const dbPool = require('./config/db.js'); 
const { mountainStationsData } = require('./mountainStations');
const { getFuelScore } = require('./services/simulationService.js');

async function populateFuelRatings() {
    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        console.log('기존 격자 데이터에서 임상도 코드를 가져옵니다...');
        const [rows] = await connection.query("SELECT id, imsangdo_frtp_cd FROM imported_fire_data_auto");

        console.log(`${rows.length}개의 데이터에 대한 연료 등급 계산을 시작합니다.`);
        const valuesToInsert = rows.map(row => {
            const fuelScore = getFuelScore(row.imsangdo_frtp_cd);
            return [row.id, fuelScore];
        });

        console.log('새로운 grid_fuel_ratings 테이블에 데이터를 삽입합니다...');
        await connection.query("TRUNCATE TABLE grid_fuel_ratings"); 
        await connection.query(
            "INSERT INTO grid_fuel_ratings (grid_id, fuel_score) VALUES ?", 
            [valuesToInsert]
        );

        await connection.commit();
        console.log('연료 등급 데이터 생성 및 저장이 완료되었습니다!');
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('연료 등급 데이터 생성 중 오류 발생:', error);
    } finally {
        if (connection) connection.release();
        dbPool.end();
    }
}

populateFuelRatings();