const API_BASE_URL = window.CLICK_CART_API_BASE || 'http://localhost:5000';
const CART_STORAGE_KEY = 'clickCartCart';

let cart = loadCartFromStorage();
const user = JSON.parse(localStorage.getItem('user'));
let currentProduct = null;
let wishlistItemsCache = [];

// --- AUTH HEADER HELPER ---
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

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

// --- CART PERSISTENCE ---
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

// ==================== WISHLIST (product detail page heart button) ====================
// Requires login — a wishlist only makes sense tied to an account.
// These calls hit the /wishlist routes added to server.js.

async function checkWishlistStatus(productId) {
  if (!user) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/wishlist/user/${user.id}`, {
      headers: { ...authHeaders() }
    });
    if (!res.ok) return false;
    const wishlist = await res.json();
    return wishlist.some(p => p.id === productId);
  } catch {
    return false;
  }
}

async function toggleWishlist(productId) {
  if (!user) {
    alert('Please login to use the wishlist.');
    window.location.href = 'index.html';
    return;
  }

  const btn = document.getElementById('pdWishlistBtn');
  const wasActive = btn.classList.contains('active');
  btn.disabled = true;

  try {
    if (wasActive) {
      await fetch(`${API_BASE_URL}/wishlist/${productId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
      });
    } else {
      await fetch(`${API_BASE_URL}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ product_id: productId })
      });
    }
    renderWishlistButton(!wasActive);
  } catch {
    alert('Could not update wishlist. Please try again.');
  } finally {
    btn.disabled = false;
  }
}

function renderWishlistButton(active) {
  const btn = document.getElementById('pdWishlistBtn');
  const label = document.getElementById('pdWishlistLabel');
  if (!btn || !label) return;
  btn.classList.toggle('active', active);
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  label.textContent = active ? 'Remove from Wishlist' : 'Add to Wishlist';
}

// ==================== WISHLIST MODAL ====================


async function openWishlistModal() {
  if (!user) {
    alert('Please login to view your wishlist.');
    window.location.href = 'index.html';
    return;
  }
  const listEl = document.getElementById('wishlistList');
  listEl.innerHTML = '<p style="color:#999;">Loading wishlist...</p>';
  document.getElementById('wishlistModal').classList.add('active');

  try {
    const res = await fetch(`${API_BASE_URL}/wishlist/user/${user.id}`, {
      headers: { ...authHeaders() }
    });
    wishlistItemsCache = await res.json();
    renderWishlistModal();
  } catch {
    listEl.innerHTML = '<p style="color:#999;">Could not load wishlist.</p>';
  }
}

function renderWishlistModal() {
  const listEl = document.getElementById('wishlistList');
  listEl.innerHTML = wishlistItemsCache.length === 0
    ? '<p style="color:#999;">Your wishlist is empty.</p>'
    : wishlistItemsCache.map(p => `
      <div class="wishlist-item">
        <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" onerror="this.src='https://via.placeholder.com/70'" onclick="window.location.href='product.html?id=${p.id}'"/>
        <div class="wishlist-item-info" onclick="window.location.href='product.html?id=${p.id}'">
          <h4>${escapeHtml(p.name)}</h4>
          <p>Rs ${parseFloat(p.price).toFixed(2)}</p>
        </div>
        <div class="wishlist-item-actions">
          <button class="btn-add-cart-mini" onclick="addToCart(${p.id}, '${escapeForOnclick(p.name)}', ${p.price}, '${escapeForOnclick(p.image_url)}')" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</button>
          <button class="remove-item" onclick="removeFromWishlistModal(${p.id})" aria-label="Remove ${escapeForOnclick(p.name)} from wishlist">&#x2715;</button>
        </div>
      </div>`).join('');
}

async function removeFromWishlistModal(productId) {
  try {
    await fetch(`${API_BASE_URL}/wishlist/${productId}`, {
      method: 'DELETE',
      headers: { ...authHeaders() }
    });
    wishlistItemsCache = wishlistItemsCache.filter(p => p.id !== productId);
    renderWishlistModal();

    
    if (currentProduct && currentProduct.id === productId) {
      renderWishlistButton(false);
    }
  } catch {
    alert('Could not remove item. Please try again.');
  }
}

// ==================== PRODUCT DETAILS ====================
async function loadProductDetails() {
  const productId = Number(new URLSearchParams(window.location.search).get('id'));
  const loadingEl = document.getElementById('productDetailLoading');
  const gridEl = document.getElementById('productDetailGrid');

  if (!productId) {
    loadingEl.textContent = 'No product specified.';
    return;
  }

  try {
    
    const res = await fetch(`${API_BASE_URL}/products`);
    const products = await res.json();
    const product = products.find(p => p.id === productId);

    if (!product) {
      loadingEl.textContent = 'Product not found.';
      return;
    }

    currentProduct = product;
    renderProduct(product);
    loadingEl.style.display = 'none';
    gridEl.style.display = 'grid';

    const isWishlisted = await checkWishlistStatus(product.id);
    renderWishlistButton(isWishlisted);
  } catch {
    loadingEl.textContent = 'Could not load product. Make sure server is running!';
  }
}

function renderProduct(p) {
  document.title = `Click Cart - ${p.name}`;

  document.getElementById('pdImage').src = p.image_url;
  document.getElementById('pdImage').alt = p.name;
  document.getElementById('pdCategory').textContent = p.category;
  document.getElementById('pdName').textContent = p.name;
  document.getElementById('pdPrice').textContent = `Rs ${parseFloat(p.price).toFixed(2)}`;
  document.getElementById('pdDescription').textContent = p.description;

  const stockEl = document.getElementById('pdStock');
  stockEl.textContent = p.stock > 0 ? `In Stock (${p.stock})` : 'Out of Stock';
  stockEl.classList.add(p.stock > 0 ? 'in-stock' : 'out-stock');

  const breadcrumbCategory = document.getElementById('breadcrumbCategory');
  breadcrumbCategory.textContent = p.category;
  breadcrumbCategory.href = `shop.html?category=${encodeURIComponent(p.category)}`;
  document.getElementById('breadcrumbName').textContent = p.name;

  const addToCartBtn = document.getElementById('pdAddToCartBtn');
  if (p.stock === 0) {
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = 'Out of Stock';
  }
  addToCartBtn.addEventListener('click', () => {
    addToCart(p.id, p.name, p.price, p.image_url);
  });

  document.getElementById('pdWishlistBtn').addEventListener('click', () => {
    toggleWishlist(p.id);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (user) {
    document.getElementById('userMenuSection').style.display = 'block';
    document.getElementById('guestSection').style.display = 'none';
    document.getElementById('userBtn').textContent = user.name;
  }
  updateCartUI();
  loadProductDetails();
});

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
        full_name: fullName, phone, address,
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