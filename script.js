/* ─────────────────────────────────────────────────────────────
  Step-In-Style (SIS) Collection — Frontend Script (Backend-Connected)
  API_BASE auto-detects: same origin in production,
  localhost:3000 in local dev.
───────────────────────────────────────────────────────────── */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `${window.location.protocol}//${window.location.hostname}:3000/api`
  : '/api';

/* ── HELPERS ─────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('me_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/* ── LOADER ─────────────────────────────────────────────── */
(function initLoader() {
  document.body.classList.add('loading');
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
      document.body.classList.remove('loading');
    }, 2000);
  });
})();

/* ── CUSTOM CURSOR ──────────────────────────────────────── */
(function initCursor() {
  const cursor   = document.getElementById('cursor');
  const follower = document.getElementById('cursor-follower');
  let followerX = 0, followerY = 0, cursorX = 0, cursorY = 0;

  document.addEventListener('mousemove', e => {
    cursorX = e.clientX; cursorY = e.clientY;
    cursor.style.left = cursorX + 'px';
    cursor.style.top  = cursorY + 'px';
  });

  (function animateFollower() {
    followerX += (cursorX - followerX) * 0.12;
    followerY += (cursorY - followerY) * 0.12;
    follower.style.left = followerX + 'px';
    follower.style.top  = followerY + 'px';
    requestAnimationFrame(animateFollower);
  })();

  const interactives = 'a, button, .collection-card, .product-card, .nav-link, input, textarea';
  document.querySelectorAll(interactives).forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
})();

/* ── NAVBAR ──────────────────────────────────────────────── */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ── MOBILE MENU ─────────────────────────────────────────── */
(function initMobileMenu() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  btn.addEventListener('click', () => {
    const open = btn.classList.toggle('open');
    menu.classList.toggle('open', open);
  });
  menu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      btn.classList.remove('open'); menu.classList.remove('open');
    });
  });
})();

/* ── REVEAL ON SCROLL ───────────────────────────────────── */
(function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.15 });
  els.forEach(el => observer.observe(el));
})();

/* ── ANIMATED COUNTERS ──────────────────────────────────── */
(function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target, target = parseInt(el.dataset.count, 10), duration = 1800, start = performance.now();
      const tick = now => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(tick); else el.textContent = target.toLocaleString();
      };
      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  }, { threshold: 0.3 });
  counters.forEach(c => observer.observe(c));
})();

/* ── PRODUCTS ────────────────────────────────────────────── */
let ALL_PRODUCTS  = [];
let visibleCount  = 8;

function productBg(id) {
  const bgs = [
    'linear-gradient(135deg,#1a1a2e,#16213e)',
    'linear-gradient(135deg,#2d1b33,#4a1942)',
    'linear-gradient(135deg,#1a2f1a,#2d4a2d)',
    'linear-gradient(135deg,#2f2a1a,#4a3d1a)',
    'linear-gradient(135deg,#1c1c2e,#2e1f5e)',
    'linear-gradient(135deg,#2a1a1a,#4a2d2d)',
    'linear-gradient(135deg,#1a2a2a,#1e4a4a)',
    'linear-gradient(135deg,#252525,#3a3a3a)',
    'linear-gradient(135deg,#1f1a2e,#3d2d5e)',
    'linear-gradient(135deg,#2e1e2a,#5e3a5a)',
    'linear-gradient(135deg,#1a2a1a,#2a5e3a)',
    'linear-gradient(135deg,#2a1e1a,#5e3a2d)',
  ];
  return bgs[(id - 1) % bgs.length];
}

async function loadProducts() {
  try {
    const data = await apiFetch('/products?limit=100');
    ALL_PRODUCTS = data.products;
    renderProducts();
  } catch (err) {
    console.warn('API unavailable, using fallback products:', err.message);
    // Fallback hardcoded products when backend is not running
    ALL_PRODUCTS = [
      { id:1,  name:'Midnight Tuxedo',       category:"Men's Formal",    price:1850,  old_price:null, emoji:'🤵', badge:'New',  rating:5 },
      { id:2,  name:'Velvet Evening Gown',   category:"Women's Couture", price:2200,  old_price:null, emoji:'👗', badge:'New',  rating:5 },
      { id:3,  name:'Cashmere Overcoat',     category:'Casual Luxury',   price:1350,  old_price:1680, emoji:'🧥', badge:'Sale', rating:4 },
      { id:4,  name:'Silk Palazzo Set',      category:"Women's Couture", price:980,   old_price:null, emoji:'👘', badge:null,   rating:5 },
      { id:5,  name:'Heritage Wool Suit',    category:"Men's Formal",    price:2450,  old_price:null, emoji:'🕴', badge:'New',  rating:5 },
      { id:6,  name:'Linen Blazer',          category:'Casual Luxury',   price:720,   old_price:900,  emoji:'🧍', badge:'Sale', rating:4 },
      { id:7,  name:'Pearl Clutch Bag',      category:'Accessories',     price:580,   old_price:null, emoji:'👜', badge:null,   rating:5 },
      { id:8,  name:'Gold Chain Necklace',   category:'Accessories',     price:340,   old_price:null, emoji:'📿', badge:'New',  rating:4 },
      { id:9,  name:'Tailored Trench Coat',  category:"Men's Formal",    price:1680,  old_price:null, emoji:'🧥', badge:null,   rating:5 },
      { id:10, name:'Chiffon Wrap Dress',    category:"Women's Couture", price:850,   old_price:1100, emoji:'👒', badge:'Sale', rating:4 },
      { id:11, name:'Embroidered Kaftan',    category:'Casual Luxury',   price:680,   old_price:null, emoji:'👚', badge:'New',  rating:5 },
      { id:12, name:'Leather Oxford Shoes',  category:'Accessories',     price:960,   old_price:null, emoji:'👞', badge:null,   rating:5 },
    ];
    renderProducts();
  }
}

function renderProducts() {
  const grid  = document.getElementById('products-grid');
  const slice = ALL_PRODUCTS.slice(0, visibleCount);

  grid.innerHTML = slice.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img" style="${p.image_url ? `background:url('${p.image_url}') center/cover no-repeat` : `background:${productBg(p.id)}`}">
        ${p.badge ? `<span class="product-badge ${p.badge==='Sale'?'sale':''}">${p.badge}</span>` : ''}
        <button class="product-wishlist" aria-label="Wishlist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>
        <div class="product-swatch">${p.emoji || '👕'}</div>
        <div class="product-overlay">
          <button class="product-add-btn" data-id="${p.id}">Add to Bag</button>
        </div>
      </div>
      <div class="product-info">
        <h4>${p.name}</h4>
        <p class="product-cat">${p.category}</p>
        <div class="product-price-row">
          <span class="product-price">GH₵${p.price.toLocaleString()}</span>
          ${p.old_price ? `<span class="product-price-old">GH₵${p.old_price.toLocaleString()}</span>` : ''}
        </div>
        <div class="product-rating">${'★'.repeat(p.rating||5)}${'☆'.repeat(5-(p.rating||5))}</div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.product-add-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); addToCart(parseInt(btn.dataset.id, 10)); });
  });
  grid.querySelectorAll('.product-wishlist').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const svg = btn.querySelector('path');
      const liked = svg.getAttribute('fill') === 'currentColor';
      svg.setAttribute('fill', liked ? 'none' : 'currentColor');
      showToast(liked ? '🤍 Removed from wishlist' : '❤️ Added to wishlist');
    });
  });

  document.getElementById('load-more').style.display =
    visibleCount >= ALL_PRODUCTS.length ? 'none' : 'inline-flex';
}

document.getElementById('load-more').addEventListener('click', () => {
  visibleCount += 4;
  renderProducts();
});

/* ── CART ────────────────────────────────────────────────── */
const SHIPPING_THRESHOLD = 500;
const SHIPPING_COST = 35;
let cart = loadCartFromStorage();

function loadCartFromStorage() {
  try { return JSON.parse(localStorage.getItem('me_cart') || '[]'); } catch { return []; }
}
function saveCartToStorage() {
  localStorage.setItem('me_cart', JSON.stringify(cart));
  // Sync to server if logged in
  const token = localStorage.getItem('me_token');
  if (token) {
    apiFetch('/cart', { method:'PUT', body: JSON.stringify({ items: cart }) }).catch(() => {});
  }
}

function addToCart(id) {
  const product = ALL_PRODUCTS.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty += 1; else cart.push({ ...product, qty: 1 });
  saveCartToStorage();
  updateCartUI();
  openCart();
  showToast(`✦ ${product.name} added to your bag`);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCartToStorage();
  updateCartUI();
}

function updateCartUI() {
  const count    = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : (cart.length > 0 ? SHIPPING_COST : 0);
  const total    = subtotal + shipping;

  // Badge
  const countEl = document.getElementById('cart-count');
  countEl.textContent = count;
  countEl.classList.toggle('visible', count > 0);

  // Footer
  const footerEl = document.getElementById('cart-footer');
  footerEl.style.display = cart.length > 0 ? 'block' : 'none';
  document.getElementById('cart-subtotal-price').textContent = `GH₵${subtotal.toLocaleString()}`;

  const shippingRow = document.getElementById('cart-shipping-row');
  if (shipping === 0 && subtotal >= SHIPPING_THRESHOLD) {
    document.getElementById('cart-shipping-price').textContent = 'FREE';
    shippingRow.style.color = 'var(--gold)';
  } else {
    document.getElementById('cart-shipping-price').textContent = `GH₵${shipping.toLocaleString()}`;
    shippingRow.style.color = '';
  }
  document.getElementById('cart-total-price').textContent = `GH₵${total.toLocaleString()}`;

  // Items
  const itemsEl = document.getElementById('cart-items');
  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p>Your bag is empty</p>
        <a href="#collections" class="btn btn-primary" id="cart-shop-link">Start Shopping</a>
      </div>`;
    document.getElementById('cart-shop-link')?.addEventListener('click', closeCart);
  } else {
    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-img" style="background:${productBg(item.id)}">${item.emoji || '👕'}</div>
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-cat">${item.category} · Qty ${item.qty}</p>
          <p class="cart-item-price">GH₵${(item.price * item.qty).toLocaleString()}</p>
          <button class="cart-item-remove" data-id="${item.id}">Remove</button>
        </div>
      </div>`).join('');
    itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id, 10)));
    });
  }
}

function openCart()  {
  document.getElementById('cart-sidebar').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
}
function closeCart() {
  document.getElementById('cart-sidebar').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
}

document.getElementById('cart-btn').addEventListener('click', openCart);
document.getElementById('cart-close').addEventListener('click', closeCart);
document.getElementById('cart-overlay').addEventListener('click', closeCart);

/* ── TESTIMONIALS ────────────────────────────────────────── */
(function initTestimonials() {
  const cards = document.querySelectorAll('.testimonial-card');
  const dots  = document.querySelectorAll('.dot');
  let current = 0, timer;
  function goTo(idx) {
    cards[current].classList.remove('active'); dots[current].classList.remove('active');
    current = idx;
    cards[current].classList.add('active'); dots[current].classList.add('active');
    clearInterval(timer);
    timer = setInterval(() => goTo((current + 1) % cards.length), 5000);
  }
  dots.forEach(dot => dot.addEventListener('click', () => goTo(parseInt(dot.dataset.idx, 10))));
  timer = setInterval(() => goTo((current + 1) % cards.length), 5000);
})();

/* ── TOAST ───────────────────────────────────────────────── */
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'show' + (type ? ` toast-${type}` : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ── NEWSLETTER FORM ─────────────────────────────────────── */
document.getElementById('newsletter-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const input = this.querySelector('input');
  const btn   = this.querySelector('button');
  const orig  = btn.textContent;
  btn.textContent = 'Subscribing…'; btn.disabled = true;
  try {
    const data = await apiFetch('/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email: input.value })
    });
    showToast('✦ ' + data.message);
    input.value = ''; input.blur();
  } catch (err) {
    showToast('⚠ ' + err.message, 'error');
  } finally {
    btn.textContent = orig; btn.disabled = false;
  }
});

/* ── CONTACT FORM ────────────────────────────────────────── */
document.getElementById('contact-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn  = this.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  const inputs = this.querySelectorAll('input, textarea');
  const [firstName, lastName, email, message] = [...inputs].map(i => i.value);

  btn.textContent = 'Sending…'; btn.disabled = true;
  try {
    const data = await apiFetch('/contact', {
      method: 'POST',
      body: JSON.stringify({ first_name: firstName, last_name: lastName, email, message })
    });
    showToast('✦ ' + data.message);
    this.reset();
  } catch (err) {
    showToast('⚠ ' + err.message, 'error');
  } finally {
    btn.textContent = orig; btn.disabled = false;
  }
});

/* ── SEARCH ──────────────────────────────────────────────── */
document.getElementById('search-btn').addEventListener('click', () => {
  showToast('🔍 Search feature coming soon');
});

/* ── TILT EFFECT ─────────────────────────────────────────── */
(function initTilt() {
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x*6}deg) rotateX(${-y*6}deg) scale(1.01)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateY(0) rotateX(0) scale(1)';
    });
  });
})();

/* ── SMOOTH SCROLL ───────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });
});

/* ── CARD ANIMATIONS ─────────────────────────────────────── */
(function initCardAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.product-card, .collection-card, .feature-item').forEach((card, i) => {
        card.style.opacity = '0'; card.style.transform = 'translateY(30px)';
        setTimeout(() => {
          card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          card.style.opacity = '1'; card.style.transform = 'translateY(0)';
        }, i * 80);
      });
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.05 });
  document.querySelectorAll('.products-grid, .collections-grid, .features-inner').forEach(g => observer.observe(g));
})();

/* ── MODAL HELPERS ───────────────────────────────────────── */
function openModal(overlayId, modalId) {
  document.getElementById(overlayId).classList.add('open');
  document.getElementById(modalId).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(overlayId, modalId) {
  document.getElementById(overlayId).classList.remove('open');
  document.getElementById(modalId).classList.remove('open');
  document.body.style.overflow = '';
}
function switchAuthPanel(show) {
  ['auth-login-panel','auth-register-panel','auth-account-panel'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== show);
  });
}

/* ── AUTH ────────────────────────────────────────────────── */
let currentUser = null;

function loadUserFromStorage() {
  try {
    const stored = localStorage.getItem('me_user');
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function setUser(user, token) {
  currentUser = user;
  if (token)  localStorage.setItem('me_token', token);
  if (user)   localStorage.setItem('me_user', JSON.stringify(user));
  else { localStorage.removeItem('me_token'); localStorage.removeItem('me_user'); }
  updateAccountBtn();
}

function updateAccountBtn() {
  const btn = document.getElementById('account-btn');
  if (currentUser) {
    btn.title = `Signed in as ${currentUser.first_name}`;
    btn.style.color = 'var(--gold, #c9a84c)';
  } else {
    btn.title = 'My Account';
    btn.style.color = '';
  }
}

// Open account modal
document.getElementById('account-btn').addEventListener('click', () => {
  if (currentUser) {
    document.getElementById('account-name').textContent = `${currentUser.first_name} ${currentUser.last_name}`;
    document.getElementById('account-email-display').textContent = currentUser.email;
    document.getElementById('account-avatar').textContent = currentUser.first_name.charAt(0).toUpperCase();
    document.getElementById('orders-panel').classList.add('hidden');
    switchAuthPanel('auth-account-panel');
  } else {
    document.getElementById('login-error').textContent = '';
    switchAuthPanel('auth-login-panel');
  }
  openModal('auth-overlay', 'auth-modal');
});

document.getElementById('auth-modal-close').addEventListener('click', () => closeModal('auth-overlay', 'auth-modal'));
document.getElementById('auth-overlay').addEventListener('click', () => closeModal('auth-overlay', 'auth-modal'));
document.getElementById('show-register').addEventListener('click', () => {
  document.getElementById('register-error').textContent = '';
  switchAuthPanel('auth-register-panel');
});
document.getElementById('show-login').addEventListener('click', () => {
  document.getElementById('login-error').textContent = '';
  switchAuthPanel('auth-login-panel');
});

// Login
document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('login-submit-btn');
  errEl.textContent = '';
  btn.textContent = 'Signing in…'; btn.disabled = true;
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email:    document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
      })
    });
    setUser(data.user, data.token);
    // Sync local cart to server
    if (cart.length > 0) {
      await apiFetch('/cart', { method:'PUT', body: JSON.stringify({ items: cart }) }).catch(() => {});
    } else {
      // Load server cart
      const cartData = await apiFetch('/cart').catch(() => ({ items: [] }));
      if (cartData.items.length > 0) { cart = cartData.items; saveCartToStorage(); updateCartUI(); }
    }
    closeModal('auth-overlay', 'auth-modal');
    showToast(`✦ Welcome back, ${data.user.first_name}!`);
    this.reset();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
});

// Register
document.getElementById('register-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const errEl = document.getElementById('register-error');
  const btn   = document.getElementById('register-submit-btn');
  errEl.textContent = '';
  btn.textContent = 'Creating account…'; btn.disabled = true;
  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        first_name: document.getElementById('reg-first').value,
        last_name:  document.getElementById('reg-last').value,
        email:      document.getElementById('reg-email').value,
        password:   document.getElementById('reg-password').value,
      })
    });
    setUser(data.user, data.token);
    closeModal('auth-overlay', 'auth-modal');
    showToast(`✦ Welcome to Step-In-Style (SIS) Collection, ${data.user.first_name}!`);
    this.reset();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.textContent = 'Create Account'; btn.disabled = false;
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  cart = []; saveCartToStorage(); updateCartUI();
  setUser(null, null);
  closeModal('auth-overlay', 'auth-modal');
  showToast('✦ You have been signed out.');
});

// View Orders
document.getElementById('view-orders-btn').addEventListener('click', async () => {
  const panel = document.getElementById('orders-panel');
  const list  = document.getElementById('orders-list');
  panel.classList.remove('hidden');
  list.innerHTML = '<p class="loading-text">Loading your orders…</p>';
  try {
    const data = await apiFetch('/orders');
    if (data.orders.length === 0) {
      list.innerHTML = '<p class="loading-text">No orders yet.</p>';
    } else {
      list.innerHTML = data.orders.map(o => `
        <div class="order-item">
          <div class="order-item-row">
            <strong>Order #${o.id}</strong>
            <span class="order-status status-${o.status}">${o.status}</span>
          </div>
          <div class="order-item-row muted">
            <span>${new Date(o.created_at).toLocaleDateString('en-GH', {day:'numeric',month:'short',year:'numeric'})}</span>
            <span>GH₵${o.total.toLocaleString()}</span>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    list.innerHTML = `<p class="loading-text error">${err.message}</p>`;
  }
});

document.getElementById('back-to-account').addEventListener('click', () => {
  document.getElementById('orders-panel').classList.add('hidden');
});

/* ── CHECKOUT ────────────────────────────────────────────── */
document.getElementById('checkout-btn').addEventListener('click', () => {
  if (cart.length === 0) return;
  // Pre-fill if user is logged in
  if (currentUser) {
    document.getElementById('co-first').value = currentUser.first_name || '';
    document.getElementById('co-last').value  = currentUser.last_name  || '';
    document.getElementById('co-email').value = currentUser.email      || '';
    document.getElementById('co-phone').value = currentUser.phone      || '';
  }
  // Build summary
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  document.getElementById('checkout-summary').innerHTML = `
    <div class="summary-row"><span>Items (${cart.reduce((s,i)=>s+i.qty,0)})</span><span>GH₵${subtotal.toLocaleString()}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<em>FREE</em>' : `GH₵${shipping}`}</span></div>
    <div class="summary-row total-row"><span>Total</span><span>GH₵${(subtotal+shipping).toLocaleString()}</span></div>
  `;
  document.getElementById('checkout-step-1').classList.remove('hidden');
  document.getElementById('checkout-step-2').classList.add('hidden');
  document.getElementById('checkout-error').textContent = '';
  closeCart();
  openModal('checkout-overlay', 'checkout-modal');
});

document.getElementById('checkout-modal-close').addEventListener('click', () => closeModal('checkout-overlay', 'checkout-modal'));
document.getElementById('checkout-overlay').addEventListener('click', () => closeModal('checkout-overlay', 'checkout-modal'));

document.getElementById('checkout-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const errEl = document.getElementById('checkout-error');
  const btn   = document.getElementById('place-order-btn');
  errEl.textContent = '';
  btn.textContent = 'Placing order…'; btn.disabled = true;

  const payment = document.querySelector('input[name="payment"]:checked')?.value || 'card';

  try {
    const data = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        first_name:     document.getElementById('co-first').value,
        last_name:      document.getElementById('co-last').value,
        email:          document.getElementById('co-email').value,
        phone:          document.getElementById('co-phone').value,
        address:        document.getElementById('co-address').value,
        city:           document.getElementById('co-city').value,
        region:         document.getElementById('co-region').value,
        items:          cart.map(i => ({ id: i.id, qty: i.qty })),
        payment_method: payment,
        notes:          document.getElementById('co-notes').value,
      })
    });

    // Show confirmation
    document.getElementById('checkout-step-1').classList.add('hidden');
    document.getElementById('checkout-step-2').classList.remove('hidden');
    document.getElementById('order-confirm-msg').textContent =
      `Order #${data.order.id} placed! You'll receive confirmation at ${data.order.email}.`;
    document.getElementById('order-confirm-details').innerHTML = `
      <div class="summary-row"><span>Order #</span><span>${data.order.id}</span></div>
      <div class="summary-row"><span>Total</span><span>GH₵${data.order.total.toLocaleString()}</span></div>
      <div class="summary-row"><span>Status</span><span class="order-status status-${data.order.status}">${data.order.status}</span></div>
    `;

    // Clear cart
    cart = []; saveCartToStorage(); updateCartUI();
    this.reset();
  } catch (err) {
    errEl.textContent = err.message;
    btn.textContent = 'Place Order'; btn.disabled = false;
  }
});

document.getElementById('order-done-btn').addEventListener('click', () => {
  closeModal('checkout-overlay', 'checkout-modal');
  showToast('✦ Thank you for shopping with Step-In-Style (SIS) Collection!');
});

/* ── INIT ────────────────────────────────────────────────── */
currentUser = loadUserFromStorage();
updateAccountBtn();
updateCartUI();
loadProducts();
