/* ─────────────────────────────────────────────────────────────
  Step-In-Style (SIS) Collection — Admin Panel Script
───────────────────────────────────────────────────────────── */

const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `${window.location.protocol}//${window.location.hostname}:3000/api`
  : '/api';

let adminToken = localStorage.getItem('me_admin_token') || '';
let currentOrderId = null, currentMsgId = null;

/* ── HELPERS ─────────────────────────────────────────────── */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  const res  = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('admin-toast');
  el.textContent = msg; el.className = 'show' + (type ? ` ${type}` : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function fmt(n)    { return 'GH₵' + Number(n).toLocaleString(); }
function fmtDate(s){ return new Date(s).toLocaleDateString('en-GH',{day:'numeric',month:'short',year:'numeric'}); }
function badge(val, cls) { return `<span class="badge badge-${cls||val}">${val}</span>`; }
function spinner() { return '<span class="spinner"></span>'; }

/* ── LOGIN ───────────────────────────────────────────────── */
document.getElementById('admin-login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const errEl = document.getElementById('adm-error');
  const btn   = document.getElementById('adm-login-btn');
  errEl.textContent = ''; btn.textContent = 'Signing in…'; btn.disabled = true;
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: document.getElementById('adm-email').value, password: document.getElementById('adm-pass').value })
    });
    if (data.user.role !== 'admin') throw new Error('Access denied. Admin accounts only.');
    adminToken = data.token;
    localStorage.setItem('me_admin_token', adminToken);
    document.getElementById('admin-name').textContent   = `${data.user.first_name} ${data.user.last_name}`;
    document.getElementById('admin-avatar').textContent = data.user.first_name.charAt(0);
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
});

document.getElementById('admin-logout').addEventListener('click', () => {
  adminToken = ''; localStorage.removeItem('me_admin_token');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
});

/* ── AUTO-LOGIN ──────────────────────────────────────────── */
async function tryAutoLogin() {
  if (!adminToken) return;
  try {
    const me = await api('/auth/me');
    if (me.role !== 'admin') throw new Error('Not admin');
    document.getElementById('admin-name').textContent   = `${me.first_name} ${me.last_name}`;
    document.getElementById('admin-avatar').textContent = me.first_name.charAt(0);
    showApp();
  } catch { adminToken = ''; localStorage.removeItem('me_admin_token'); }
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadPage('dashboard');
}

/* ── NAVIGATION ──────────────────────────────────────────── */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => loadPage(item.dataset.page));
});

function loadPage(name) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === name));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${name}`));
  switch (name) {
    case 'dashboard':  loadDashboard();  break;
    case 'products':   loadProducts();   break;
    case 'orders':     loadOrders();     break;
    case 'users':      loadUsers();      break;
    case 'newsletter': loadNewsletter(); break;
    case 'contacts':   loadContacts();   break;
  }
}

/* ── DASHBOARD ───────────────────────────────────────────── */
async function loadDashboard() {
  document.getElementById('stats-grid').innerHTML = spinner();
  document.getElementById('dash-recent-orders').innerHTML = spinner();
  document.getElementById('dash-categories').innerHTML = spinner();
  try {
    const d = await api('/admin/dashboard');
    const { stats, recentOrders, salesByCategory } = d;

    document.getElementById('stats-grid').innerHTML = [
      { label:'Total Revenue',   value: fmt(stats.total_revenue),   icon:'💰' },
      { label:'Total Orders',    value: stats.total_orders,          icon:'📦' },
      { label:'Pending Orders',  value: stats.pending_orders,        icon:'⏳' },
      { label:'Products',        value: stats.total_products,        icon:'🛍' },
      { label:'Customers',       value: stats.total_users,           icon:'👤' },
      { label:'Subscribers',     value: stats.newsletter_subs,       icon:'✉' },
      { label:'Unread Messages', value: stats.unread_contacts,       icon:'💬' },
      { label:'Confirmed Orders',value: stats.confirmed_orders,      icon:'✅' },
    ].map(s => `
      <div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-icon">${s.icon}</div>
      </div>`).join('');

    document.getElementById('dash-recent-orders').innerHTML = recentOrders.length === 0
      ? '<div class="empty-state">No orders yet</div>'
      : `<table><thead><tr><th>#</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${recentOrders.map(o => `<tr>
          <td>${o.id}</td><td>${o.customer}</td>
          <td>${fmt(o.total)}</td><td>${badge(o.status)}</td>
        </tr>`).join('')}
        </tbody></table>`;

    document.getElementById('dash-categories').innerHTML = salesByCategory.length === 0
      ? '<div class="empty-state">No sales data</div>'
      : `<table><thead><tr><th>Category</th><th>Revenue</th></tr></thead><tbody>
        ${salesByCategory.map(c => `<tr><td>${c.category||'—'}</td><td>${fmt(c.revenue)}</td></tr>`).join('')}
        </tbody></table>`;
  } catch (err) {
    document.getElementById('stats-grid').innerHTML = `<p style="color:var(--red);padding:16px">${err.message}</p>`;
  }
}

/* ── PRODUCTS ────────────────────────────────────────────── */
async function loadProducts() {
  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = `<tr><td colspan="7">${spinner()}</td></tr>`;
  try {
    const { products } = await api('/admin/products');
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.emoji || '👕'} ${p.name}</td>
        <td>${p.category}</td>
        <td>${fmt(p.price)}${p.old_price ? `<br><small style="color:var(--muted);text-decoration:line-through">${fmt(p.old_price)}</small>` : ''}</td>
        <td>${p.badge ? badge(p.badge, p.badge === 'Sale' ? 'sale' : 'new') : '—'}</td>
        <td>${p.in_stock ? '<span style="color:var(--green)">✓</span>' : '<span style="color:var(--red)">✗</span>'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openEditProduct(${p.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id},'${p.name.replace(/'/g,"\\'")}')">Del</button>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red);padding:16px">${err.message}</td></tr>`;
  }
}

// Add product
document.getElementById('add-product-btn').addEventListener('click', () => {
  document.getElementById('product-dialog-title').textContent = 'Add Product';
  document.getElementById('product-form').reset();
  document.getElementById('p-id').value = '';
  openDialog('product-overlay');
});

// Product form submit
document.getElementById('product-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('product-save-btn');
  const id  = document.getElementById('p-id').value;
  btn.textContent = 'Saving…'; btn.disabled = true;

  const body = {
    name:       document.getElementById('p-name').value,
    category:   document.getElementById('p-category').value,
    price:      parseFloat(document.getElementById('p-price').value),
    old_price:  parseFloat(document.getElementById('p-old-price').value) || null,
    image_url:  document.getElementById('p-image-url').value || null,
    badge:      document.getElementById('p-badge').value || null,
    rating:     parseInt(document.getElementById('p-rating').value),
    emoji:      document.getElementById('p-emoji').value || '👕',
    in_stock:   parseInt(document.getElementById('p-stock').value),
    description:document.getElementById('p-desc').value,
  };

  try {
    if (id) {
      await api(`/admin/products/${id}`, { method:'PUT', body: JSON.stringify(body) });
      toast('Product updated ✓', 'success');
    } else {
      await api('/admin/products', { method:'POST', body: JSON.stringify(body) });
      toast('Product added ✓', 'success');
    }
    closeDialog('product-overlay');
    loadProducts();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.textContent = 'Save Product'; btn.disabled = false;
  }
});

async function openEditProduct(id) {
  try {
    const p = await api(`/products/${id}`);
    document.getElementById('product-dialog-title').textContent = 'Edit Product';
    document.getElementById('p-id').value        = p.id;
    document.getElementById('p-name').value      = p.name;
    document.getElementById('p-category').value  = p.category;
    document.getElementById('p-price').value     = p.price;
    document.getElementById('p-old-price').value = p.old_price || '';
    document.getElementById('p-badge').value     = p.badge || '';
    document.getElementById('p-rating').value    = p.rating;
    document.getElementById('p-emoji').value     = p.emoji || '';
    document.getElementById('p-image-url').value = p.image_url || '';
    document.getElementById('p-stock').value     = p.in_stock;
    document.getElementById('p-desc').value      = p.description || '';
    openDialog('product-overlay');
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await api(`/admin/products/${id}`, { method:'DELETE' });
    toast('Product deleted', 'success');
    loadProducts();
  } catch (err) { toast(err.message, 'error'); }
}

document.getElementById('product-cancel').addEventListener('click',  () => closeDialog('product-overlay'));
document.getElementById('product-dialog-close').addEventListener('click', () => closeDialog('product-overlay'));

/* ── ORDERS ──────────────────────────────────────────────── */
async function loadOrders() {
  const tbody  = document.getElementById('orders-tbody');
  const status = document.getElementById('order-status-filter').value;
  tbody.innerHTML = `<tr><td colspan="8">${spinner()}</td></tr>`;
  try {
    const { orders } = await api('/admin/orders' + (status ? `?status=${status}` : ''));
    if (!orders.length) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">No orders found</div></td></tr>'; return; }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.first_name} ${o.last_name}</td>
        <td>${o.email}</td>
        <td>${fmt(o.total)}</td>
        <td style="text-transform:capitalize">${o.payment_method.replace('_',' ')}</td>
        <td>${badge(o.status)}</td>
        <td>${fmtDate(o.created_at)}</td>
        <td><button class="btn btn-sm btn-outline" onclick="openOrderDialog(${o.id},'${o.status}')">Status</button></td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--red);padding:16px">${err.message}</td></tr>`;
  }
}

document.getElementById('order-status-filter').addEventListener('change', loadOrders);

function openOrderDialog(id, currentStatus) {
  currentOrderId = id;
  document.getElementById('order-dialog-id').textContent = id;
  document.getElementById('order-new-status').value = currentStatus;
  openDialog('order-overlay');
}

document.getElementById('order-save-btn').addEventListener('click', async () => {
  const btn = document.getElementById('order-save-btn');
  btn.textContent = 'Saving…'; btn.disabled = true;
  try {
    await api(`/admin/orders/${currentOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: document.getElementById('order-new-status').value })
    });
    toast('Order status updated ✓', 'success');
    closeDialog('order-overlay');
    loadOrders();
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.textContent = 'Update Status'; btn.disabled = false; }
});

document.getElementById('order-cancel').addEventListener('click',      () => closeDialog('order-overlay'));
document.getElementById('order-dialog-close').addEventListener('click', () => closeDialog('order-overlay'));

/* ── USERS ───────────────────────────────────────────────── */
async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = `<tr><td colspan="7">${spinner()}</td></tr>`;
  try {
    const { users } = await api('/admin/users');
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No users yet</div></td></tr>'; return; }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.first_name} ${u.last_name}</td>
        <td>${u.email}</td>
        <td>${u.phone || '—'}</td>
        <td>${badge(u.role)}</td>
        <td>${fmtDate(u.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="toggleRole(${u.id},'${u.role}')">
            ${u.role === 'admin' ? 'Demote' : 'Make Admin'}
          </button>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red);padding:16px">${err.message}</td></tr>`;
  }
}

async function toggleRole(id, current) {
  const newRole = current === 'admin' ? 'customer' : 'admin';
  if (!confirm(`Change this user's role to "${newRole}"?`)) return;
  try {
    await api(`/admin/users/${id}/role`, { method:'PATCH', body: JSON.stringify({ role: newRole }) });
    toast(`Role updated to ${newRole} ✓`, 'success');
    loadUsers();
  } catch (err) { toast(err.message, 'error'); }
}

/* ── NEWSLETTER ──────────────────────────────────────────── */
async function loadNewsletter() {
  const tbody  = document.getElementById('newsletter-tbody');
  const active = document.getElementById('newsletter-filter').value;
  tbody.innerHTML = `<tr><td colspan="4">${spinner()}</td></tr>`;
  try {
    const url = active !== '' ? `/admin/newsletter?active=${active}` : '/admin/newsletter';
    const { subscribers } = await api(url);
    if (!subscribers.length) { tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state">No subscribers</div></td></tr>'; return; }
    tbody.innerHTML = subscribers.map(s => `
      <tr>
        <td>${s.id}</td>
        <td>${s.email}</td>
        <td>${s.active ? '<span style="color:var(--green)">Active</span>' : '<span style="color:var(--muted)">Unsubscribed</span>'}</td>
        <td>${fmtDate(s.created_at)}</td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--red);padding:16px">${err.message}</td></tr>`;
  }
}

document.getElementById('newsletter-filter').addEventListener('change', loadNewsletter);

/* ── CONTACTS ────────────────────────────────────────────── */
async function loadContacts() {
  const tbody  = document.getElementById('contacts-tbody');
  const status = document.getElementById('contact-status-filter').value;
  tbody.innerHTML = `<tr><td colspan="7">${spinner()}</td></tr>`;
  try {
    const { messages } = await api('/admin/contacts' + (status ? `?status=${status}` : ''));
    if (!messages.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No messages</div></td></tr>'; return; }
    tbody.innerHTML = messages.map(m => `
      <tr>
        <td>${m.id}</td>
        <td>${m.first_name} ${m.last_name}</td>
        <td>${m.email}</td>
        <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.message.slice(0,60)}…</td>
        <td>${badge(m.status, m.status)}</td>
        <td>${fmtDate(m.created_at)}</td>
        <td><button class="btn btn-sm btn-outline" onclick="openMsgDialog(${m.id})">View</button></td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red);padding:16px">${err.message}</td></tr>`;
  }
}

document.getElementById('contact-status-filter').addEventListener('change', loadContacts);

let contactsCache = [];
async function openMsgDialog(id) {
  currentMsgId = id;
  // Try to get from cache or re-fetch
  try {
    const { messages } = await api('/admin/contacts');
    contactsCache = messages;
  } catch {}
  const m = contactsCache.find(x => x.id === id);
  if (!m) { toast('Message not found', 'error'); return; }

  document.getElementById('msg-dialog-title').textContent = `Message from ${m.first_name} ${m.last_name}`;
  document.getElementById('msg-dialog-body').innerHTML = `
    <div style="margin-bottom:8px"><small style="color:var(--muted)">${m.email} · ${fmtDate(m.created_at)}</small></div>
    <div class="msg-body">${m.message.replace(/\n/g,'<br>')}</div>`;
  document.getElementById('msg-new-status').value = m.status;
  openDialog('msg-overlay');
}

document.getElementById('msg-save-btn').addEventListener('click', async () => {
  const btn = document.getElementById('msg-save-btn');
  btn.textContent = 'Saving…'; btn.disabled = true;
  try {
    await api(`/admin/contacts/${currentMsgId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: document.getElementById('msg-new-status').value })
    });
    toast('Status updated ✓', 'success');
    closeDialog('msg-overlay');
    loadContacts();
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.textContent = 'Update Status'; btn.disabled = false; }
});

document.getElementById('msg-cancel').addEventListener('click',      () => closeDialog('msg-overlay'));
document.getElementById('msg-dialog-close').addEventListener('click', () => closeDialog('msg-overlay'));

/* ── DIALOG HELPERS ──────────────────────────────────────── */
function openDialog(id)  { document.getElementById(id).classList.add('open'); }
function closeDialog(id) { document.getElementById(id).classList.remove('open'); }

// Close on overlay click
document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
});

/* ── BOOT ────────────────────────────────────────────────── */
tryAutoLogin();
