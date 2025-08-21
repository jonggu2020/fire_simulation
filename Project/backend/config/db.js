// /config/db.js

// .env 파일을 읽기 위해 최상단에 추가합니다.
require('dotenv').config();

const mysql = require('mysql2/promise');

// .env 파일의 정보를 사용하여 DB 연결 풀을 생성하고 내보냅니다.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;