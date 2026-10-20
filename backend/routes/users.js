const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { check, text, ok, route } = require('../helpers');
const { auth, role, token } = require('../auth');
const fields = 'id,username,full_name,department,position,role,active';
function password(value) {
  check(
    typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value) <= 72,
    'รหัสผ่านอย่างน้อย 8 ตัวอักษร ไม่เกิน 72 ไบต์',
  );
  return value;
}
router.post(
  '/login',
  route(async (req, res) => {
    const rows = await query('SELECT * FROM users WHERE username=?', [text(req.body.username, 50)]);
    const user = rows[0];
    check(
      user && user.active && (await bcrypt.compare(String(req.body.password || ''), user.password)),
      'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      401,
    );
    ok(res, { token: token(user) });
  }),
);
router.post(
  '/register',
  route(async (req, res) => {
    const b = req.body;
    await query('INSERT INTO users(username,password,full_name,role) VALUES(?,?,?,?)', [
      text(b.username, 50),
      await bcrypt.hash(password(b.password), 10),
      text(b.full_name),
      'evaluatee',
    ]);
    ok(res, null, 'สมัครแล้ว เข้าสู่ระบบได้');
  }),
);
router.get(
  '/me',
  auth,
  route(async (req, res) => ok(res, req.user)),
);
router.put(
  '/me/password',
  auth,
  route(async (req, res) => {
    const b = req.body;
    const next = password(b.new_password);
    check(next === b.confirm_password, 'ยืนยันรหัสผ่านไม่ตรงกัน');
    const [user] = await query('SELECT * FROM users WHERE id=?', [req.user.id]);
    check(
      await bcrypt.compare(String(b.current_password || ''), user.password),
      'รหัสผ่านปัจจุบันไม่ถูกต้อง',
      400,
    );
    check(!(await bcrypt.compare(next, user.password)), 'รหัสผ่านใหม่ต้องต่างจากรหัสเดิม');
    const updated = await query(
      'UPDATE users SET password=?,must_change_password=0,token_version=token_version+1 WHERE id=? AND token_version=?',
      [await bcrypt.hash(next, 10), user.id, user.token_version],
    );
    check(updated.affectedRows, 'ข้อมูลเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่', 401);
    ok(
      res,
      { token: token({ ...user, token_version: user.token_version + 1 }) },
      'เปลี่ยนรหัสผ่านแล้ว',
    );
  }),
);
router.put(
  '/me',
  auth,
  route(async (req, res) => {
    const b = req.body;
    await query('UPDATE users SET full_name=?,department=?,position=? WHERE id=?', [
      text(b.full_name),
      text(b.department, 100, false),
      text(b.position, 100, false),
      req.user.id,
    ]);
    ok(res);
  }),
);
router.get(
  '/users',
  auth,
  role('admin'),
  route(async (req, res) => ok(res, await query(`SELECT ${fields} FROM users ORDER BY id`))),
);
router.post(
  '/users',
  auth,
  role('admin'),
  route(async (req, res) => {
    const b = req.body;
    check(['evaluatee', 'evaluator'].includes(b.role), 'เลือกบทบาทให้ถูกต้อง');
    await query(
      'INSERT INTO users(username,password,full_name,department,position,role) VALUES(?,?,?,?,?,?)',
      [
        text(b.username, 50),
        await bcrypt.hash(password(b.password), 10),
        text(b.full_name),
        text(b.department, 100, false),
        text(b.position, 100, false),
        b.role,
      ],
    );
    ok(res);
  }),
);
router.put(
  '/users/:id',
  auth,
  role('admin'),
  route(async (req, res) => {
    const b = req.body;
    check(Number(req.params.id) !== req.user.id || b.active, 'ห้ามปิดบัญชีตนเอง');
    const result = await query(
      'UPDATE users SET full_name=?,department=?,position=?,active=? WHERE id=?',
      [
        text(b.full_name),
        text(b.department, 100, false),
        text(b.position, 100, false),
        b.active ? 1 : 0,
        req.params.id,
      ],
    );
    check(result.affectedRows, 'ไม่พบผู้ใช้', 404);
    ok(res);
  }),
);
module.exports = router;
