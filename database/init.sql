CREATE DATABASE IF NOT EXISTS db_direktori_ta;
USE db_direktori_ta;

CREATE TABLE IF NOT EXISTS mahasiswa (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nim VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS proyek_ta (
    id INT PRIMARY KEY AUTO_INCREMENT,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    status ENUM('menunggu', 'disetujui', 'ditolak') DEFAULT 'menunggu',
    kelompok_id INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anggota_kelompok (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mahasiswa_id INT,
    proyek_id INT,
    role_assignment VARCHAR(50),
    FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE,
    FOREIGN KEY (proyek_id) REFERENCES proyek_ta(id) ON DELETE CASCADE
);

-- Data Awal untuk Testing
INSERT IGNORE INTO mahasiswa (nim, nama) VALUES ('2201', 'Haffi'), ('2202', 'Anggota D4');