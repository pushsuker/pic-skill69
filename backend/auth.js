const jwt = require('jsonwebtoken');
const { query } = require('./db');
const { check, route } = require('./helpers');
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) throw Error('รัน npm run setup ก่อนเปิดระบบ');
const auth = route(async (req, res, next) => {
  let payload;
  try {
    payload = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), secret);
  } catch {
    check(false, 'กรุณาเข้าสู่ระบบ', 401);
  }
  const rows = await query(
    'SELECT id,username,full_name,department,position,role,active,must_change_password,token_version FROM users WHERE id=?',
    [payload.id],
  );
  check(rows.length && rows[0].active, 'บัญชีถูกปิดหรือไม่พบผู้ใช้', 401);
  check(
    (payload.version ?? 0) === rows[0].token_version,
    'รหัสผ่านเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่',
    401,
  );
  req.user = rows[0];
  check(
    !req.user.must_change_password ||
      (req.method === 'GET' && req.path === '/me') ||
      (req.method === 'PUT' && req.path === '/me/password'),
    'กรุณาเปลี่ยนรหัสผ่านครั้งแรกก่อนใช้งาน',
    403,
  );
  next();
});
function role(name) {
  return (req, res, next) =>
    req.user.role === name
      ? next()
      : res.status(403).json({ status: 'error', message: 'ไม่มีสิทธิ์', data: null });
}
function token(user) {
  return jwt.sign({ id: user.id, version: user.token_version || 0 }, secret, { expiresIn: '8h' });
}
module.exports = { auth, role, token };
