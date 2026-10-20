// ลำดับสำคัญ: JSON → Login → ตรวจ token → API ตามระบบ → error (ไม่ส่งหน้าเว็บ)
const express = require('express');
const { query } = require('./db');
const { auth } = require('./auth');
const { ok, route } = require('./helpers');
const app = express();
app.use(express.json());
app.get(
  '/api/health',
  route(async (req, res) => {
    await query('SELECT 1 FROM users LIMIT 1');
    ok(res, { ready: true });
  }),
);
app.use('/api', require('./routes/users'));
app.use('/api', auth);
app.use('/api', require('./routes/periods'));
app.use('/api', require('./routes/self'));
app.use('/api', require('./routes/evaluate'));
app.use('/api', require('./routes/files'));
app.use('/api', require('./routes/reports'));
app.use('/api', (req, res) =>
  res.status(404).json({ status: 'error', message: 'ไม่พบ API', data: null }),
);
app.use((error, req, res, next) => {
  let message = error.message,
    status = error.status || 500;
  if (error.code === 'ER_DUP_ENTRY') {
    message = 'ข้อมูลซ้ำ กรุณาตรวจชื่อผู้ใช้หรือรายการที่เพิ่ม';
    status = 400;
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    message = 'ไฟล์เกิน 5 MB';
    status = 400;
  }
  if (status === 500) {
    console.error(error.code || error.message);
    message = 'ระบบขัดข้อง ตรวจ Terminal ของ server';
  }
  res.status(status).json({ status: 'error', message, data: null });
});
if (require.main === module)
  app.listen(Number(process.env.PORT || 3301), '127.0.0.1', () =>
    console.log('เปิด http://127.0.0.1:' + (process.env.PORT || 3301)),
  );
module.exports = app;
