/* ─────────────────────────────────────────────────────────────
   database.js — Node 22 built-in SQLite schema + seed
───────────────────────────────────────────────────────────── */
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path   = require('path');
const fs     = require('fs');
require('dotenv').config();

// Prefer new DB filename, but fall back to legacy DB if present (preserves existing data)
const NEW_DB = path.join(__dirname, 'stepinstyle.db');
const LEGACY_DB = path.join(__dirname, 'maison_elite.db');
const DB_PATH = fs.existsSync(NEW_DB) ? NEW_DB : (fs.existsSync(LEGACY_DB) ? LEGACY_DB : NEW_DB);
const db = new DatabaseSync(DB_PATH);

// Enable WAL + foreign keys
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// ── SCHEMA ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
    phone      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    price       REAL NOT NULL,
    old_price   REAL,
    image_url   TEXT,
    emoji       TEXT DEFAULT '👕',
    badge       TEXT,
    rating      INTEGER DEFAULT 5 CHECK(rating BETWEEN 1 AND 5),
    description TEXT,
    in_stock    INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS carts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    items_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    guest_email     TEXT,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT NOT NULL,
    phone           TEXT,
    address         TEXT NOT NULL,
    city            TEXT NOT NULL,
    region          TEXT,
    items_json      TEXT NOT NULL,
    subtotal        REAL NOT NULL,
    shipping        REAL NOT NULL DEFAULT 0,
    total           REAL NOT NULL,
    payment_method  TEXT NOT NULL DEFAULT 'card',
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS newsletter (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,
    email      TEXT NOT NULL,
    message    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread','read','replied')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
`);
const productCols = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
if (!productCols.includes('image_url')) {
  db.exec('ALTER TABLE products ADD COLUMN image_url TEXT');
}
// ── SEED PRODUCTS ────────────────────────────────────────────
const productCount = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;

if (productCount === 0) {
  const ins = db.prepare(`
    INSERT INTO products (name,category,price,old_price,emoji,badge,rating,description,in_stock)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);
  const products = [
    ['Midnight Tuxedo',       "Men's Formal",    1850,  null, '🤵', 'New',  5, 'A masterfully tailored midnight-black tuxedo. Single-breasted silhouette with peak lapels and satin shawl collar. Crafted from 100% Italian wool.',                                                1],
    ['Velvet Evening Gown',   "Women's Couture", 2200,  null, '👗', 'New',  5, 'Sweeping floor-length gown in crushed deep-plum velvet. Hand-finished seams, structured bodice, and a dramatic open back.',                                                                        1],
    ['Cashmere Overcoat',     'Casual Luxury',   1350,  1680, '🧥', 'Sale', 4, 'Relaxed-fit overcoat in Grade-A Mongolian cashmere. Understated notch lapels and a clean single-button closure.',                                                                                  1],
    ['Silk Palazzo Set',      "Women's Couture", 980,   null, '👘', null,   5, 'Fluid wide-leg palazzo trousers and a matching cropped cami, cut from pure 19mm silk charmeuse.',                                                                                                  1],
    ['Heritage Wool Suit',    "Men's Formal",    2450,  null, '🕴', 'New',  5, 'Two-piece suit in tightly woven English Shetland wool. Double-breasted front with gold-toned buttons.',                                                                                            1],
    ['Linen Blazer',          'Casual Luxury',   720,   900,  '🧍', 'Sale', 4, "Unstructured single-breasted blazer in 100% Irish linen. Natural, breathable fabric. Available in sand, sage, and navy.",                                                                         1],
    ['Pearl Clutch Bag',      'Accessories',     580,   null, '👜', null,   5, 'Compact hard-shell clutch with a hand-stitched freshwater pearl exterior and a brushed gold chain.',                                                                                               1],
    ['Gold Chain Necklace',   'Accessories',     340,   null, '📿', 'New',  4, '18k gold-plated heavy-link chain necklace. 60cm length with a secure lobster-claw clasp.',                                                                                                        1],
    ['Tailored Trench Coat',  "Men's Formal",    1680,  null, '🧥', null,   5, 'Classic double-breasted trench in cotton-gabardine with a removable wool inner. A timeless silhouette.',                                                                                          1],
    ['Chiffon Wrap Dress',    "Women's Couture", 850,   1100, '👒', 'Sale', 4, 'Self-tie wrap dress in pleated silk chiffon. A universally flattering cut. Exclusive tonal floral print.',                                                                                         1],
    ['Embroidered Kaftan',    'Casual Luxury',   680,   null, '👚', 'New',  5, 'Hand-embroidered kaftan in ivory Ghanaian kente cotton. Intricate geometric motifs celebrating West African artisanal heritage.',                                                                   1],
    ['Leather Oxford Shoes',  'Accessories',     960,   null, '👞', null,   5, 'Full-grain calf-leather Oxfords with a Goodyear-welted sole. Hand-burnished finish. Made by artisans in Córdoba, Spain.',                                                                          1],
  ];
  db.exec('BEGIN TRANSACTION');
  products.forEach(p => ins.run(...p));
  db.exec('COMMIT');
  console.log('✅  Seeded 12 products');
}

// ── SEED ADMIN ───────────────────────────────────────────────
const adminEmail = process.env.ADMIN_EMAIL || 'admin@stepinstyle.com';
const adminPass  = process.env.ADMIN_PASSWORD || 'Admin123!';
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!adminExists) {
  const hash = bcrypt.hashSync(adminPass, 12);
  db.prepare(
    "INSERT INTO users (first_name,last_name,email,password,role) VALUES (?,?,?,?,'admin')"
  ).run('Admin', 'User', adminEmail, hash);
  console.log(`✅  Admin seeded — ${adminEmail}`);
}

module.exports = db;
