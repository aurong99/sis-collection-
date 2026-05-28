/* routes/products.js */
const express = require('express');
const router  = express.Router();
const db      = require('../database');

// GET /api/products — list with optional filters
router.get('/', (req, res) => {
  const { category, badge, search, sort = 'id', order = 'asc', limit, offset } = req.query;

  let sql    = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (badge)    { sql += ' AND badge = ?';    params.push(badge); }
  if (search)   {
    sql += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const allowedSort  = ['id','name','price','rating','created_at'];
  const allowedOrder = ['asc','desc'];
  const safeSort  = allowedSort.includes(sort)  ? sort  : 'id';
  const safeOrder = allowedOrder.includes(order) ? order : 'asc';
  sql += ` ORDER BY ${safeSort} ${safeOrder.toUpperCase()}`;

  if (limit)  { sql += ' LIMIT ?';  params.push(Number(limit)); }
  if (offset) { sql += ' OFFSET ?'; params.push(Number(offset)); }

  const products = db.prepare(sql).all(...params);
  const total    = db.prepare(
    'SELECT COUNT(*) AS n FROM products WHERE 1=1' +
    (category ? ' AND category=?' : '') +
    (badge    ? ' AND badge=?'    : '') +
    (search   ? ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)' : '')
  ).get(...params.slice(0, params.length - (limit ? 1 : 0) - (offset ? 1 : 0))).n;

  res.json({ products, total });
});

// GET /api/products/categories — unique category list
router.get('/categories', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  res.json(rows.map(r => r.category));
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json(product);
});

module.exports = router;
