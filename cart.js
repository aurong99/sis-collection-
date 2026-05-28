/* routes/cart.js — server-side cart for logged-in users */
const express     = require('express');
const router      = express.Router();
const db          = require('../database');
const requireAuth = require('../middleware/auth');

// GET /api/cart
router.get('/', requireAuth, (req, res) => {
  const row = db.prepare('SELECT items_json FROM carts WHERE user_id=?').get(req.user.id);
  const items = row ? JSON.parse(row.items_json) : [];
  res.json({ items });
});

// PUT /api/cart — sync entire cart (replaces server copy)
router.put('/', requireAuth, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array.' });

  // validate each item references a real product
  const productIds = items.map(i => i.id);
  const valid = productIds.every(pid => db.prepare('SELECT id FROM products WHERE id=?').get(pid));
  if (!valid) return res.status(400).json({ error: 'One or more product IDs are invalid.' });

  const json = JSON.stringify(items);
  const existing = db.prepare('SELECT id FROM carts WHERE user_id=?').get(req.user.id);
  if (existing) {
    db.prepare('UPDATE carts SET items_json=?, updated_at=datetime("now") WHERE user_id=?')
      .run(json, req.user.id);
  } else {
    db.prepare('INSERT INTO carts (user_id, items_json) VALUES (?,?)').run(req.user.id, json);
  }
  res.json({ items, message: 'Cart saved.' });
});

// DELETE /api/cart — clear cart
router.delete('/', requireAuth, (req, res) => {
  db.prepare('DELETE FROM carts WHERE user_id=?').run(req.user.id);
  res.json({ message: 'Cart cleared.' });
});

module.exports = router;
