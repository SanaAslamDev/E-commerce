const API_BASE_URL = window.CLICK_CART_API_BASE || 'http://localhost:5000';

const SECTIONS = ['dashboard', 'products', 'orders'];

// --- AUTH HEADER HELPER ---
// Every admin request now identifies the caller via the stored token
// instead of relying purely on the client-side role check at the top of
// admin.html (that check only hides the page — it does not protect the
// API, so the server must verify this token/role on its end too).
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ========== ESCAPE FUNCTIONS ==========

function escapeForOnclick(str) {
  return String(str)
    .replace(/\\/g, '\\\\')  
    .replace(/'/g, "\\'")    
    .replace(/"/g, '&quot;');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- NAVIGATION ---
function showSection(name) {
  SECTIONS.forEach(s => document.getElementById('section-' + s).style.display = 'none');
  document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
  document.getElementById('section-' + name).style.display = 'block';
  document.getElementById('menu' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');

  if (name === 'dashboard') loadStats();
  else if (name === 'products') loadProducts();
  else if (name === 'orders') loadOrders();

  closeAdminNav();
}

// --- SIDEBAR MOBILE BURGER ---
function toggleAdminNav() {
  const wrap = document.getElementById('sidebarMenuWrap');
  const burger = document.getElementById('sidebarBurger');
  if (!wrap || !burger) return;
  const isOpen = wrap.classList.toggle('open');
  burger.classList.toggle('active', isOpen);
  burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function closeAdminNav() {
  const wrap = document.getElementById('sidebarMenuWrap');
  const burger = document.getElementById('sidebarBurger');
  if (!wrap || !burger) return;
  wrap.classList.remove('open');
  burger.classList.remove('active');
  burger.setAttribute('aria-expanded', 'false');
}

// --- DASHBOARD ---
async function loadStats() {
  try {
    const [products, orders] = await Promise.all([
      fetch(`${API_BASE_URL}/products`, { headers: { ...authHeaders() } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/orders`, { headers: { ...authHeaders() } }).then(r => r.json())
    ]);

    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statOrders').textContent = orders.length;

    const revenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
    document.getElementById('statRevenue').textContent = 'Rs ' + revenue.toFixed(2);

    const pendingEl = document.getElementById('statPending');
    if (pendingEl) {
      const pending = orders.filter(o => o.status === 'Pending').length;
      pendingEl.textContent = pending;
    }

    renderRecentOrders(orders);
  } catch (err) { console.log('Stats error:', err); }
}

function renderRecentOrders(orders) {
  const body = document.getElementById('recentOrdersBody');
  if (!body) return;

  const recent = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  body.innerHTML = recent.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--muted-dark);padding:24px 0;">No orders yet.</td></tr>'
    : recent.map(o => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>${escapeHtml(o.customer_name || o.full_name)}</td>
        <td>Rs ${parseFloat(o.total).toFixed(2)}</td>
        <td><span class="status-pill status-${(o.status || 'pending').toLowerCase()}">${escapeHtml(o.status)}</span></td>
        <td>${new Date(o.created_at).toLocaleDateString()}</td>
      </tr>`).join('');
}

// --- PRODUCT MODAL HELPERS ---
function openProductModal() {
  document.getElementById('productModalTitle').textContent = 'Add New Product';
  ['productId', 'productName', 'productDescription', 'productPrice', 'productImage', 'productStock'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('productCategory').value = '';
  document.getElementById('productModal').classList.add('active');
}

function editProduct(id, name, desc, price, img, cat, stock) {
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('productId').value = id;
  document.getElementById('productName').value = name;
  document.getElementById('productDescription').value = desc;
  document.getElementById('productPrice').value = price;
  document.getElementById('productImage').value = img;
  document.getElementById('productCategory').value = cat;
  document.getElementById('productStock').value = stock;
  document.getElementById('productModal').classList.add('active');
}

// --- PRODUCTS ---
async function loadProducts() {
  try {
    const products = await fetch(`${API_BASE_URL}/products`, { headers: { ...authHeaders() } }).then(r => r.json());
    document.getElementById('productsBody').innerHTML = products.map(p => `
      <tr>
        <td><img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/50'"/></td>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td><span class="cat-tag">${escapeHtml(p.category)}</span></td>
        <td>Rs ${parseFloat(p.price).toFixed(2)}</td>
        <td>${p.stock}</td>
        <td>
          <button class="btn-edit" onclick="editProduct(${p.id}, '${escapeForOnclick(p.name)}', '${escapeForOnclick(p.description)}', ${p.price}, '${escapeForOnclick(p.image_url)}', '${escapeForOnclick(p.category)}', ${p.stock})">Edit</button>
          <button class="btn-delete" onclick="deleteProduct(${p.id})">Delete</button>
        </td>
      </tr>`).join('');
  } catch { alert('Could not load products!'); }
}

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  const price = document.getElementById('productPrice').value;
  const image_url = document.getElementById('productImage').value.trim();
  const category = document.getElementById('productCategory').value;
  const stock = document.getElementById('productStock').value;


  if (!name || !price || !category) { alert('Please fill Name, Price and Category!'); return; }
if (Number(price) < 0 || (stock && Number(stock) < 0)) { alert('Price and stock cannot be negative!'); return; }

  const submitBtn = document.getElementById('saveProductBtn');
  const originalLabel = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

  try {
    const url = id ? `${API_BASE_URL}/products/${id}` : `${API_BASE_URL}/products`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name, description, price, image_url, category, stock })
    });
    if (res.ok) {
      closeModal('productModal');
      loadProducts();
      alert(id ? 'Product updated!' : 'Product added!');
    } else {
      alert('Error saving product!');
    }
  } catch {
    alert('Could not connect to server!');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  try {
    await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() }
    });
    loadProducts();
    alert('Product deleted!');
  } catch { alert('Error deleting product!'); }
}

// --- ORDERS ---
async function loadOrders() {
  try {
    const orders = await fetch(`${API_BASE_URL}/orders`, { headers: { ...authHeaders() } }).then(r => r.json());
    document.getElementById('ordersBody').innerHTML = orders.map(o => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>${escapeHtml(o.customer_name || o.full_name)}</td>
        <td>${escapeHtml(o.phone)}</td>
        <td>${escapeHtml(o.address)}</td>
        <td>Rs ${parseFloat(o.total).toFixed(2)}</td>
        <td>${new Date(o.created_at).toLocaleDateString()}</td>
        <td>
          <select class="status-select" onchange="updateStatus(${o.id}, this.value)">
            <option value="Pending"    ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Shipping"   ${o.status === 'Shipping' ? 'selected' : ''}>Shipping</option>
            <option value="Delivered"  ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
      </tr>`).join('');
  } catch { alert('Could not load orders!'); }
}

async function updateStatus(orderId, status) {
  try {
    await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ status })
    });
    alert('Order status updated to: ' + status);
  } catch { alert('Error updating status!'); }
}

// --- AUTH ---
function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// --- MODALS ---
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// --- Sidebar torn-paper date stamp ---
(function setSidebarDate() {
  const el = document.getElementById('sidebarDate');
  if (!el) return;
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  el.textContent = `${dd} ${mm} ${yy}`;
})();

// Close mobile sidebar menu if user taps outside it
document.addEventListener('click', e => {
  const wrap = document.getElementById('sidebarMenuWrap');
  const burger = document.getElementById('sidebarBurger');
  if (!wrap || !wrap.classList.contains('open')) return;
  if (!wrap.contains(e.target) && !burger.contains(e.target)) closeAdminNav();
});

// Initialize dashboard
loadStats();