// TODO: Buat koneksi pool MySQL disini menggunakan Environment Variable (process.env)
const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Membuat koneksi pool MySQL
 * Konfigurasi diambil dari Environment Variables di file .env
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    // Ganti DB_PASSWORD menjadi DB_PASS agar sinkron dengan docker-compose dan .env lab
    password: process.env.DB_PASS, 
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Uji koneksi saat pertama kali dijalankan
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database terhubung dengan sukses!');
        connection.release();
    } catch (err) {
        console.error('❌ Database gagal terhubung:', err.message);
    }
})();

module.exports = pool;