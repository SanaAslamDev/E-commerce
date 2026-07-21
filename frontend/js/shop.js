const API_BASE_URL = window.CLICK_CART_API_BASE || 'http://localhost:5000';
const CART_STORAGE_KEY = 'clickCartCart';

let cart = loadCartFromStorage();
let allProducts = [];
let currentCategory = '';
const user = JSON.parse(localStorage.getItem('user'));



// --- AUTH HEADER HELPER ---
// Centralizes attaching the logged-in user's token so every authenticated
// request (orders, profile deletion, order status) actually identifies the
// caller instead of relying solely on values sent in the request body.
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// --- CART PERSISTENCE ---
// Cart previously lived only in a JS variable, so refreshing the page or
// navigating away and back silently emptied it. Persisting to
// localStorage keeps the cart intact across reloads/navigation.
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCartToStorage() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* storage unavailable — cart still works for this session */
  }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  if (user) {
    document.getElementById('userMenuSection').style.display = 'block';
    document.getElementById('guestSection').style.display = 'none';
    document.getElementById('userBtn').textContent = user.name;
  }
  const cat = new URLSearchParams(window.location.search).get('category');
  if (cat) {
    currentCategory = cat;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent === cat);
    });
  }
  updateCartUI();
  loadProducts();
});

// --- ESCAPING HELPERS ---

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

// --- PRODUCTS ---
async function loadProducts() {
  try {
    const url = currentCategory ? `${API_BASE_URL}/products?category=${encodeURIComponent(currentCategory)}` : `${API_BASE_URL}/products`;
    const res = await fetch(url);
    allProducts = await res.json();
    displayProducts(allProducts);
  } catch {
    document.getElementById('productsGrid').innerHTML = '<p class="loading-text">Could not load products. Make sure server is running!</p>';
  }
}

function displayProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!products.length) {
    grid.innerHTML = '<p class="loading-text">No products found.</p>';
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="product-img-wrap">
        <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x220?text=No+Image'"/>
        <span class="stock-badge ${p.stock > 0 ? 'in-stock' : 'out-stock'}">${p.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
      </div>
      <div class="product-info">
        <span class="product-category">${escapeHtml(p.category)}</span>
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.description)}</p>
        <div class="price">Rs ${parseFloat(p.price).toFixed(2)}</div>
       <button class="btn-add-cart" onclick="addToCart(${p.id}, '${escapeForOnclick(p.name)}', ${p.price}, '${escapeForOnclick(p.image_url)}')" ${p.stock === 0 ? 'disabled' : ''}>
          ${p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
       
      </div>
    </div>`).join('');
}

let searchDebounce;
function searchProducts() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    const q = document.getElementById('searchInput').value.toLowerCase();
    displayProducts(allProducts.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));
  }, 200);
}

function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', cat === '' ? btn.textContent === 'All' : btn.textContent === cat);
  });
  loadProducts();
}

// --- CART ---
function addToCart(id, name, price, image) {
  const existing = cart.find(i => i.id === id);
  existing ? existing.quantity++ : cart.push({ id, name, price: parseFloat(price), image, quantity: 1 });
  saveCartToStorage();
  updateCartUI();
  document.getElementById('cartPanel').classList.add('open');
  document.getElementById('cartScrim').classList.add('active');
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCartToStorage();
  updateCartUI();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  saveCartToStorage();
  updateCartUI();
}

function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  document.getElementById('cartBadge').textContent = cart.reduce((s, i) => s + i.quantity, 0);
  document.getElementById('cartTotal').textContent = `Total: Rs ${total.toFixed(2)}`;
  const subtotalEl = document.getElementById('cartSubtotal');
  if (subtotalEl) subtotalEl.textContent = `Rs ${total.toFixed(2)}`;

  document.getElementById('cartItems').innerHTML = cart.length === 0
    ? '<p class="cart-empty">Your cart is empty</p>'
    : cart.map(i => `
      <div class="cart-item">
        <img src="${escapeHtml(i.image)}" alt="${escapeHtml(i.name)}" onerror="this.src='https://via.placeholder.com/70'"/>
        <div class="cart-item-info">
          <h4>${escapeHtml(i.name)}</h4>
          <p>Rs ${i.price.toFixed(2)}</p>
          <div class="qty-stepper">
            <button onclick="changeQty(${i.id}, -1)" aria-label="Decrease quantity">-</button>
            <span>${i.quantity}</span>
            <button onclick="changeQty(${i.id}, 1)" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <button class="remove-item" onclick="removeFromCart(${i.id})" aria-label="Remove ${escapeForOnclick(i.name)} from cart">&#x2715;</button>
      </div>`).join('');
}

function toggleCart() {
  document.getElementById('cartPanel').classList.toggle('open');
  document.getElementById('cartScrim').classList.toggle('active');
}

function toggleDropdown() {
  const dropdown = document.getElementById('userDropdown');
  const btn = document.getElementById('userBtn');
  const isActive = dropdown.classList.toggle('active');
  if (btn) btn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
}

document.addEventListener('click', e => {
  const menu = document.getElementById('userMenuSection');
  if (menu && !menu.contains(e.target)) {
    document.getElementById('userDropdown').classList.remove('active');
    document.getElementById('userBtn')?.setAttribute('aria-expanded', 'false');
  }
});

// --- CHECKOUT ---
function openDeliveryModal() {
  if (!cart.length) { alert('Your cart is empty!'); return; }
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  document.getElementById('modalTotal').textContent = `Total Amount: Rs ${total.toFixed(2)}`;
  document.getElementById('deliveryModal').classList.add('active');
}

async function placeOrder() {
  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phoneNumber').value.trim();
  const street = document.getElementById('deliveryAddress').value.trim();
  const city = document.getElementById('deliveryCity')?.value.trim();
  const postal = document.getElementById('deliveryPostal')?.value.trim();
  const address = [street, city, postal].filter(Boolean).join(', ');

  if (!fullName || !phone || !street) { alert('Please fill in Name, Phone and Address!'); return; }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const submitBtn = document.getElementById('placeOrderBtn');
  const originalLabel = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Placing Order...'; }

  try {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        user_id: user ? user.id : null,
        full_name: fullName, phone, address, total,
        items: cart.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price }))
      })
    });
    const data = await res.json();
    if (res.ok) {
      closeModal('deliveryModal');
      document.getElementById('cartPanel').classList.remove('open');
      document.getElementById('cartScrim').classList.remove('active');
      showReceipt(fullName, phone, address, total);
      cart = [];
      saveCartToStorage();
      updateCartUI();
    } else {
      alert('Error: ' + (data.message || 'Could not place order.'));
    }
  } catch {
    alert('Could not connect to server!');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
  }
}

function showReceipt(name, phone, address, total) {
  document.getElementById('receiptDetails').innerHTML = `
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Address:</strong> ${escapeHtml(address)}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>`;
  document.getElementById('receiptTotal').textContent = `Total Paid: Rs ${total.toFixed(2)}`;
  document.getElementById('receiptModal').classList.add('active');
}

// --- ORDERS ---
async function showOrders() {
  toggleDropdown();
  if (!user) return;
  try {
    const orders = await (await fetch(`${API_BASE_URL}/orders/user/${user.id}`, {
      headers: { ...authHeaders() }
    })).json();
    document.getElementById('ordersList').innerHTML = orders.length === 0
      ? '<p style="color:#999;">No orders yet.</p>'
      : orders.map(o => `
        <div class="order-card">
          <h4>Order #${o.id}</h4>
          <p><strong>Address:</strong> ${escapeHtml(o.address)}</p>
          <p><strong>Total:</strong> Rs ${parseFloat(o.total).toFixed(2)}</p>
          <p><strong>Date:</strong> ${new Date(o.created_at).toLocaleDateString()}</p>
          <span class="order-status status-${o.status.toLowerCase()}">${escapeHtml(o.status)}</span>
        </div>`).join('');
    document.getElementById('ordersModal').classList.add('active');
  } catch { alert('Could not load orders!'); }
}

// --- AUTH ---
function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem(CART_STORAGE_KEY);
  window.location.href = 'index.html';
}
async function deleteProfile() {
  if (!confirm('Are you sure you want to delete your account? This cannot be undone!')) return;
  try {
    await fetch(`${API_BASE_URL}/user/${user.id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() }
    });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert('Account deleted.');
    window.location.href = 'index.html';
  } catch { alert('Error deleting account!'); }
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