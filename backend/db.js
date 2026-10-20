require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const settings = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bpes_basic_split',
  dateStrings: true,
};
const pool = mysql.createPool(settings);
async function query(sql, values = []) {
  const [rows] = await pool.execute(sql, values);
  return rows;
}
module.exports = { query, pool, settings };
