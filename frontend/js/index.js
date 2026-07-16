const API = 'http://localhost:5500';

document.addEventListener("DOMContentLoaded", () => {

    const splash = document.getElementById("splash-screen");
    const mainContent = document.getElementById("main-content");

    // Skip splash after first visit this session
    if (sessionStorage.getItem("splashShown")) {
        splash.remove();
        mainContent.classList.remove("content-hidden");
        mainContent.classList.add("content-visible");
        return;
    }

    sessionStorage.setItem("splashShown", "true");

    const percentEl = document.getElementById("splashPercent");
    const fillEl = document.getElementById("splashProgressFill");

    const DURATION = 2600;
    const start = performance.now();

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / DURATION, 1);
        const pct = Math.round(progress * 100);

        percentEl.textContent = pct + "%";
        fillEl.style.width = pct + "%";

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            setTimeout(exitSplash, 350);
        }
    }

    requestAnimationFrame(tick);

    function exitSplash() {
        splash.classList.add("fade-out");
        mainContent.classList.remove("content-hidden");
        mainContent.classList.add("content-visible");

        setTimeout(() => {
            splash.remove();
        }, 1000);
    }

});

// --- MODALS ---
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function switchModal(closeId, openId) {
  closeModal(closeId);
  openModal(openId);
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// --- NAVIGATION ---
function scrollToElement(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function goToShop() {
  window.location.href = 'shop.html';
}

function goToCategory(category) {
  window.location.href = `shop.html?category=${category}`;
}

// --- AUTH HELPERS ---
function getFormData(prefix) {
  return {
    name: document.getElementById(`${prefix}Name`)?.value.trim(),
    email: document.getElementById(`${prefix}Email`)?.value.trim(),
    password: document.getElementById(`${prefix}Password`)?.value.trim()
  };
}

function setError(id, message) {
  document.getElementById(id).textContent = message;
}

// --- REGISTER ---
async function handleRegister() {
  const { name, email, password } = getFormData('register');
  const errorDiv = 'registerError';

  if (!name || !email || !password) {
    setError(errorDiv, 'Please fill in all fields!');
    return;
  }

  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Account created! Please login.');
      switchModal('registerModal', 'loginModal');
      document.getElementById('registerName').value = '';
      document.getElementById('registerEmail').value = '';
      document.getElementById('registerPassword').value = '';
    } else {
      setError(errorDiv, data.message);
    }
  } catch {
    setError(errorDiv, 'Could not connect to server!');
  }
}

// --- LOGIN ---
async function handleLogin() {
  const { email, password } = getFormData('login');
  const errorDiv = 'loginError';

  if (!email || !password) {
    setError(errorDiv, 'Please fill in all fields!');
    return;
  }

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = data.user.role === 'admin' ? 'admin.html' : 'shop.html';
    } else {
      setError(errorDiv, data.message);
    }
  } catch {
    setError(errorDiv, 'Could not connect to server!');
  }
}

// --- NAVBAR SCROLL ---
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 40));
}

// --- FADE ON SCROLL ---
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll(
  '.fade-up, .category-card.fade-in, .about-media, .about-copy, .about-stamp, .feature-item'
).forEach(el => observer.observe(el));

// --- STAGGERED FEATURE REVEALS ---
document.querySelectorAll('.feature-item').forEach((el, i) => {
  el.style.transitionDelay = `${i * 100}ms`;
});