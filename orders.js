/* routes/orders.js */
const express     = require('express');
const router      = express.Router();
const db          = require('../database');
const requireAuth = require('../middleware/auth');

// POST /api/orders — place order (auth optional — guests allowed)
router.post('/', (req, res) => {
  const {
    first_name, last_name, email, phone,
    address, city, region,
    items, payment_method, notes
  } = req.body;

  if (!first_name || !last_name || !email || !address || !city || !items?.length) {
    return res.status(400).json({ error: 'first_name, last_name, email, address, city, and items are required.' });
  }

  // Validate items & compute totals
  let subtotal = 0;
  const enrichedItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT id,name,price,category,emoji FROM products WHERE id=?').get(item.id);
    if (!product) return res.status(400).json({ error: `Product #${item.id} not found.` });
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    subtotal += product.price * qty;
    enrichedItems.push({ ...product, qty });
  }

  const SHIPPING_THRESHOLD = 500;
  const SHIPPING_COST = 35;
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total    = subtotal + shipping;

  // Get user_id from auth header if present
  let userId = null;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      userId = payload.id;
    } catch {}
  }

  const result = db.prepare(`
    INSERT INTO orders
      (user_id, guest_email, first_name, last_name, email, phone,
       address, city, region, items_json, subtotal, shipping, total,
       payment_method, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    userId, userId ? null : email,
    first_name, last_name, email, phone || null,
    address, city, region || null,
    JSON.stringify(enrichedItems),
    subtotal, shipping, total,
    payment_method || 'card',
    notes || null
  );

  // Clear server cart for logged-in users
  if (userId) db.prepare('DELETE FROM carts WHERE user_id=?').run(userId);

  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(result.lastInsertRowid);
  res.status(201).json({
    order: { ...order, items: JSON.parse(order.items_json) },
    message: `Order #${order.id} placed successfully!`
  });
});

// GET /api/orders — user's own orders (auth required)
router.get('/', requireAuth, (req, res) => {
  const orders = db.prepare(`
    SELECT id, first_name, last_name, email, subtotal, shipping, total,
           payment_method, status, created_at
    FROM orders WHERE user_id=? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json({ orders });
});

// GET /api/orders/:id — single order (must belong to user or admin)
router.get('/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const isOwner = order.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied.' });

  res.json({ ...order, items: JSON.parse(order.items_json) });
});

module.exports = router;
