const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// --- 1. (R) READ: Mengambil Daftar Judul TA & Info Detail Anggota ---
router.get('/proyek', async (req, res) => {
    try {
        const query = `
            SELECT p.*, GROUP_CONCAT(CONCAT('• ', m.nama, ' (', ak.role_assignment, ')') SEPARATOR '<br>') as info_anggota 
            FROM proyek_ta p
            LEFT JOIN anggota_kelompok ak ON p.id = ak.proyek_id
            LEFT JOIN mahasiswa m ON ak.mahasiswa_id = m.id
            GROUP BY p.id
            ORDER BY p.updated_at DESC`;
        
        const [rows] = await pool.query(query);
        res.status(200).json({
            message: "Data Direktori TA berhasil diambil",
            data: rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 2. (C) CREATE: Input Judul TA & Banyak Anggota ---
router.post('/proyek-masal', async (req, res) => {
    const { judul, kelompok_id, nama_anggota, role_assignment } = req.body;
    const connection = await pool.getConnection(); 
    
    try {
        const [existingTitle] = await connection.query('SELECT judul FROM proyek_ta WHERE judul = ?', [judul]);
        if (existingTitle.length > 0) {
            return res.status(400).send(`<script>alert('Gagal! Judul "${judul}" sudah terdaftar.'); window.history.back();</script>`);
        }

        await connection.beginTransaction();
        const [proyekResult] = await connection.query('INSERT INTO proyek_ta (judul, kelompok_id, status) VALUES (?, ?, "menunggu")', [judul, kelompok_id]);
        const proyekId = proyekResult.insertId;

        if (nama_anggota && Array.isArray(nama_anggota)) {
            for (let i = 0; i < nama_anggota.length; i++) {
                const nama = nama_anggota[i];
                if (!nama) continue;
                
                let [mhs] = await connection.query('SELECT id FROM mahasiswa WHERE nama = ?', [nama]);
                let mhsId = mhs.length > 0 ? mhs[0].id : (await connection.query('INSERT INTO mahasiswa (nim, nama) VALUES (?, ?)', [Date.now().toString().slice(-8) + i, nama]))[0].insertId;

                await connection.query('INSERT INTO anggota_kelompok (mahasiswa_id, proyek_id, role_assignment) VALUES (?, ?, ?)', [mhsId, proyekId, role_assignment[i]]);
            }
        }

        await connection.commit();
        res.redirect('/'); 
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

/**
 * --- 3. (U) UPDATE: Memperbarui Judul & Daftar Anggota ---
 * Endpoint ini menghapus anggota lama dan memasukkan anggota baru untuk menjaga sinkronisasi data.
 */
router.put('/proyek/:id', async (req, res) => {
    const { id } = req.params;
    const { judul, nama_anggota, role_assignment } = req.body;
    const connection = await pool.getConnection();

    try {
        // Validasi duplikasi judul kecuali untuk proyek ini sendiri
        const [existing] = await connection.query('SELECT id FROM proyek_ta WHERE judul = ? AND id != ?', [judul, id]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Gagal! Judul ini sudah terdaftar oleh kelompok lain.' });
        }

        await connection.beginTransaction();

        // 1. Update Judul Proyek
        await connection.query('UPDATE proyek_ta SET judul = ? WHERE id = ?', [judul, id]);

        // 2. Hapus Relasi Anggota Lama (Replace Strategy)
        await connection.query('DELETE FROM anggota_kelompok WHERE proyek_id = ?', [id]);

        // 3. Masukkan Daftar Anggota Baru
        if (nama_anggota && Array.isArray(nama_anggota)) {
            for (let i = 0; i < nama_anggota.length; i++) {
                const nama = nama_anggota[i];
                if (!nama) continue;

                // Cari mahasiswa atau buat baru jika belum ada
                let [mhsRows] = await connection.query('SELECT id FROM mahasiswa WHERE nama = ?', [nama]);
                let mhsId;

                if (mhsRows.length > 0) {
                    mhsId = mhsRows[0].id;
                } else {
                    const [mhsResult] = await connection.query('INSERT INTO mahasiswa (nim, nama) VALUES (?, ?)', [Date.now().toString().slice(-8) + i, nama]);
                    mhsId = mhsResult.insertId;
                }

                // Simpan ke tabel relasi
                await connection.query('INSERT INTO anggota_kelompok (mahasiswa_id, proyek_id, role_assignment) VALUES (?, ?, ?)', [mhsId, id, role_assignment[i]]);
            }
        }

        await connection.commit();
        res.status(200).json({ message: "Judul dan Daftar Anggota berhasil diperbarui." });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// --- 4. (U) UPDATE: Memperbarui Status Review ---
router.post('/proyek/status/:id', async (req, res) => {
    try {
        await pool.query('UPDATE proyek_ta SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.redirect('/');
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 5. (D) DELETE: Menghapus Judul & Seluruh Anggota Terkait ---
router.delete('/proyek/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM proyek_ta WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: "Data tidak ditemukan" });
        res.status(200).json({ message: "Data berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;