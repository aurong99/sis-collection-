/* routes/admin.js — all endpoints require admin role */
const express       = require('express');
const router        = express.Router();
const bcrypt        = require('bcryptjs');
const db            = require('../database');
const requireAuth   = require('../middleware/auth');
const requireAdmin  = require('../middleware/requireAdmin');

router.use(requireAuth, requireAdmin);

/* ── DASHBOARD ────────────────────────────────────────────── */
router.get('/dashboard', (_req, res) => {
  const stats = {
    total_products:     db.prepare('SELECT COUNT(*) AS n FROM products').get().n,
    total_users:        db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='customer'").get().n,
    total_orders:       db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,
    pending_orders:     db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status='pending'").get().n,
    confirmed_orders:   db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status='confirmed'").get().n,
    total_revenue:      db.prepare("SELECT COALESCE(SUM(total),0) AS n FROM orders WHERE status NOT IN ('cancelled','pending')").get().n,
    newsletter_subs:    db.prepare("SELECT COUNT(*) AS n FROM newsletter WHERE active=1").get().n,
    unread_contacts:    db.prepare("SELECT COUNT(*) AS n FROM contacts WHERE status='unread'").get().n,
  };

  const recentOrders = db.prepare(`
    SELECT id, first_name||' '||last_name AS customer, email, total, status, created_at
    FROM orders ORDER BY created_at DESC LIMIT 5
  `).all();

  const salesByCategory = db.prepare(`
    SELECT json_extract(value,'$.category') AS category,
           SUM(json_extract(value,'$.price') * json_extract(value,'$.qty')) AS revenue
    FROM orders, json_each(orders.items_json)
    WHERE orders.status NOT IN ('cancelled','pending')
    GROUP BY category ORDER BY revenue DESC
  `).all();

  res.json({ stats, recentOrders, salesByCategory });
});

/* ── PRODUCTS ─────────────────────────────────────────────── */
router.get('/products', (_req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id').all();
  res.json({ products });
});

router.post('/products', (req, res) => {
  const { name, category, price, old_price, image_url, emoji, badge, rating, description, in_stock } = req.body;
  if (!name || !category || price == null) {
    return res.status(400).json({ error: 'name, category, and price are required.' });
  }
  const result = db.prepare(`
    INSERT INTO products (name,category,price,old_price,image_url,emoji,badge,rating,description,in_stock)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(name, category, price, old_price||null, image_url||null, emoji||'👕', badge||null, rating||5, description||null, in_stock!=null?in_stock:1);

  res.status(201).json(db.prepare('SELECT * FROM products WHERE id=?').get(result.lastInsertRowid));
});

router.put('/products/:id', (req, res) => {
  const { name, category, price, old_price, image_url, emoji, badge, rating, description, in_stock } = req.body;
  const existing = db.prepare('SELECT id FROM products WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });

  db.prepare(`
    UPDATE products SET
      name        = COALESCE(?, name),
      category    = COALESCE(?, category),
      price       = COALESCE(?, price),
      old_price   = ?,
      image_url   = ?,
      emoji       = COALESCE(?, emoji),
      badge       = ?,
      rating      = COALESCE(?, rating),
      description = COALESCE(?, description),
      in_stock    = COALESCE(?, in_stock)
    WHERE id = ?
  `).run(
    name,
    category,
    price,
    old_price!=null ? old_price : db.prepare('SELECT old_price FROM products WHERE id=?').get(req.params.id).old_price,
    image_url != null ? image_url : db.prepare('SELECT image_url FROM products WHERE id=?').get(req.params.id).image_url,
    emoji,
    badge!=null ? badge : db.prepare('SELECT badge FROM products WHERE id=?').get(req.params.id).badge,
    rating,
    description,
    in_stock,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id));
});

router.delete('/products/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM products WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ message: 'Product deleted.' });
});

/* ── ORDERS ───────────────────────────────────────────────── */
router.get('/orders', (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (status) { sql += ' WHERE status=?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const orders  = db.prepare(sql).all(...params);
  const total   = db.prepare('SELECT COUNT(*) AS n FROM orders' + (status?' WHERE status=?':'')).get(...(status?[status]:[])).n;

  res.json({
    orders: orders.map(o => ({ ...o, items: JSON.parse(o.items_json) })),
    total
  });
});

router.get('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ ...order, items: JSON.parse(order.items_json) });
});

router.patch('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['pending','confirmed','processing','shipped','delivered','cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}.` });

  const existing = db.prepare('SELECT id FROM orders WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Order not found.' });

  db.prepare("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?").run(status, req.params.id);
  res.json({ message: `Order #${req.params.id} status updated to "${status}".` });
});

/* ── NEWSLETTER ───────────────────────────────────────────── */
router.get('/newsletter', (req, res) => {
  const { active } = req.query;
  let sql = 'SELECT * FROM newsletter';
  if (active != null) { sql += ' WHERE active=?'; }
  sql += ' ORDER BY created_at DESC';
  const subs = active != null
    ? db.prepare(sql).all(active === 'true' || active === '1' ? 1 : 0)
    : db.prepare(sql).all();
  res.json({ subscribers: subs, total: subs.length });
});

/* ── CONTACTS ─────────────────────────────────────────────── */
router.get('/contacts', (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM contacts';
  if (status) { sql += ' WHERE status=?'; }
  sql += ' ORDER BY created_at DESC';
  const msgs = status ? db.prepare(sql).all(status) : db.prepare(sql).all();
  res.json({ messages: msgs, total: msgs.length });
});

router.patch('/contacts/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['unread','read','replied'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be: ${allowed.join(', ')}.` });
  const existing = db.prepare('SELECT id FROM contacts WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found.' });
  db.prepare('UPDATE contacts SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ message: 'Status updated.' });
});

/* ── USERS ────────────────────────────────────────────────── */
router.get('/users', (req, res) => {
  const users = db.prepare(
    "SELECT id,first_name,last_name,email,role,phone,created_at FROM users ORDER BY created_at DESC"
  ).all();
  res.json({ users, total: users.length });
});

router.patch('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['customer','admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be customer or admin.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found.' });
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  res.json({ message: `User #${req.params.id} role set to "${role}".` });
});

router.delete('/users/:id', (req, res) => {
  // Prevent admin from deleting themselves
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found.' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: 'User deleted.' });
});

module.exports = router;
