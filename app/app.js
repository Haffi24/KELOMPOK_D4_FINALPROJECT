const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Inisialisasi Environment Variables
dotenv.config();

/** * PATH ROUTE & DATABASE: Mengacu pada folder routes/index.js dan config/database.js.
 */
const itemRoutes = require('./routes/index'); 
const pool = require('./config/database');    

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Setup View Engine (EJS)
app.set('view engine', 'ejs');

/** * Folder 'view' (tanpa 's') sesuai dengan struktur direktori VS Code Anda.
 */
app.set('views', path.join(__dirname, 'view'));

// 2. Middleware
/**
 * express.json() sangat penting untuk mendukung fitur Update melalui Fetch API (JSON).
 */
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, 'public'))); 

// 3. Route Halaman Utama dengan Fitur Pagination (Maksimal 10 data per halaman)
/**
 * Route ini menangani skenario Read dengan pembagian halaman (Pagination).
 * Setiap halaman menampilkan maksimal 10 data proyek agar tampilan tabel tetap rapi.
 */
app.get('/', async (req, res) => {
    try {
        // --- LOGIKA PAGINATION ---
        const limit = 10; // Mengubah limit menjadi 10 data per halaman sesuai standar profesional
        const page = parseInt(req.query.page) || 1; 
        const offset = (page - 1) * limit; 

        // 1. Menghitung total seluruh data untuk menentukan jumlah halaman
        const [totalRows] = await pool.query('SELECT COUNT(*) as count FROM proyek_ta');
        const totalData = totalRows[0].count;
        const totalPages = Math.ceil(totalData / limit);

        // 2. Query SQL: Mengambil data dengan LIMIT dan OFFSET untuk pagination
        /**
         * Menggunakan GROUP_CONCAT untuk menggabungkan nama anggota dan perannya 
         * agar bisa ditampilkan dalam satu kolom tabel yang rapi.
         */
        const query = `
            SELECT p.*, GROUP_CONCAT(CONCAT('• ', m.nama, ' (', ak.role_assignment, ')') SEPARATOR '<br>') as info_anggota 
            FROM proyek_ta p
            LEFT JOIN anggota_kelompok ak ON p.id = ak.proyek_id
            LEFT JOIN mahasiswa m ON ak.mahasiswa_id = m.id
            GROUP BY p.id
            ORDER BY p.updated_at DESC
            LIMIT ? OFFSET ?`;
            
        const [rows] = await pool.query(query, [limit, offset]);
        
        // Render view/index.ejs dengan menyertakan variabel yang dibutuhkan frontend profesional
        res.render('index', { 
            items: rows,
            currentPage: page,
            totalPages: totalPages,
            totalData: totalData
        });
    } catch (error) {
        console.error('Error Database:', error.message);
        res.status(500).send('Terjadi kesalahan pada database saat memuat halaman.');
    }
});

// 4. Menggunakan API Routes untuk Create, Update, Delete, dan Update Status
app.use('/api', itemRoutes);

// 5. Server Listener
app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`🚀 Direktori TA Kelompok D4 Berjalan`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`📂 Database: ${process.env.DB_NAME || 'db_direktori_ta'}`);
    console.log(`===========================================`);
});