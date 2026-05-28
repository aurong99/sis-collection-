/* routes/contact.js */
const express = require('express');
const router  = express.Router();
const db      = require('../database');

// POST /api/contact
router.post('/', (req, res) => {
  const { first_name, last_name, email, message } = req.body;

  if (!first_name || !last_name || !email || !message) {
    return res.status(400).json({ error: 'first_name, last_name, email, and message are required.' });
  }
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (message.trim().length < 10) {
    return res.status(400).json({ error: 'Message must be at least 10 characters.' });
  }

  const result = db.prepare(`
    INSERT INTO contacts (first_name, last_name, email, message)
    VALUES (?, ?, ?, ?)
  `).run(first_name.trim(), last_name.trim(), email.trim(), message.trim());

  res.status(201).json({
    id: result.lastInsertRowid,
    message: 'Your message has been received. We\'ll be in touch shortly. ✦'
  });
});

module.exports = router;
