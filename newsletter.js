/* routes/newsletter.js */
const express = require('express');
const router  = express.Router();
const db      = require('../database');

// POST /api/newsletter — subscribe
router.post('/', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const existing = db.prepare('SELECT id, active FROM newsletter WHERE email=?').get(email);

  if (existing) {
    if (existing.active) return res.status(409).json({ error: 'This email is already subscribed.' });
    // Re-activate unsubscribed email
    db.prepare('UPDATE newsletter SET active=1 WHERE id=?').run(existing.id);
    return res.json({ message: 'Welcome back to the Inner Circle! 🎉' });
  }

  db.prepare('INSERT INTO newsletter (email) VALUES (?)').run(email);
  res.status(201).json({ message: 'You\'ve joined the Inner Circle! ✦' });
});

// POST /api/newsletter/unsubscribe
router.post('/unsubscribe', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const row = db.prepare('SELECT id FROM newsletter WHERE email=?').get(email);
  if (!row) return res.status(404).json({ error: 'Email not found.' });

  db.prepare('UPDATE newsletter SET active=0 WHERE id=?').run(row.id);
  res.json({ message: 'You have been unsubscribed.' });
});

module.exports = router;
