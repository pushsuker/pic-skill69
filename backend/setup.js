// รันครั้งแรก: สร้างฐานใหม่และบัญชีฝึก ไม่ล้างข้อมูลที่มีอยู่
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) fs.copyFileSync(path.join(__dirname, '.env.example'), envPath);
let env = fs.readFileSync(envPath, 'utf8');
if (!env.match(/^JWT_SECRET=.{32,}$/m)) {
  env = env.replace(/^JWT_SECRET=.*$/m, 'JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
  fs.writeFileSync(envPath, env);
}
const { settings, pool } = require('./db');
async function setup() {
  if (!/^bpes_basic_split(_[a-zA-Z0-9]+)*$/.test(settings.database))
    throw Error('ใช้ชื่อฐาน bpes_basic_split หรือ bpes_basic_split_ชื่อห้อง เท่านั้น');
  const db = await mysql.createConnection({
    ...settings,
    database: undefined,
    multipleStatements: true,
  });
  try {
    await db.query(
      `CREATE DATABASE IF NOT EXISTS \`${settings.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await db.query(`USE \`${settings.database}\``);
    await db.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    // เพิ่มคอลัมน์ให้ฐานที่สร้างจากฉบับก่อนหน้า โดยไม่ล้างข้อมูล
    const [columns] = await db.query('SHOW COLUMNS FROM users');
    if (!columns.some((c) => c.Field === 'must_change_password'))
      await db.query('ALTER TABLE users ADD must_change_password BOOLEAN NOT NULL DEFAULT TRUE');
    if (!columns.some((c) => c.Field === 'token_version'))
      await db.query('ALTER TABLE users ADD token_version INT NOT NULL DEFAULT 0');
    const users = [
      ['admin', 'Admin1234!', 'ฝ่ายบุคลากร', 'admin'],
      ['emp001', 'Emp1234!', 'ผู้รับหนึ่ง', 'evaluatee'],
      ['emp002', 'Emp1234!', 'ผู้รับสอง', 'evaluatee'],
      ['eval01', 'Eval1234!', 'กรรมการหนึ่ง', 'evaluator'],
      ['eval02', 'Eval1234!', 'กรรมการสอง', 'evaluator'],
    ];
    for (const [username, password, name, role] of users) {
      await db.execute(
        'INSERT IGNORE INTO users(username,password,full_name,role) VALUES(?,?,?,?)',
        [username, await bcrypt.hash(password, 10), name, role],
      );
    }
    console.log(
      'พร้อมแล้ว ฐานข้อมูล:',
      settings.database,
      'กลับโฟลเดอร์หลักแล้วเปิด dev:backend และ dev:frontend คนละ Terminal',
    );
  } finally {
    await db.end();
    await pool.end();
  }
}
setup().catch((error) => {
  console.error('ตั้งค่าไม่สำเร็จ:', error.code || error.message);
  process.exitCode = 1;
});
