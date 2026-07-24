<div align="center">

#  Click Cart

**A modern full-stack e-commerce application.**
Built with HTML, CSS, JavaScript, Node.js, Express, PostgreSQL, and JWT Authentication.

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-00E599?style=flat-square&logo=postgresql&logoColor=white)

### [🔗 Live Demo](https://clickcart01.netlify.app/)

</div>

---

## About

Click Cart is a full-stack e-commerce storefront with a complete shopping flow — browsing, product details, cart, checkout, order history, and wishlist — plus a separate admin dashboard for managing products and orders. Built from scratch to practice real-world full-stack patterns: JWT-secured API routes, server-side price/stock validation, transactional order creation, and a responsive, accessible frontend.

---

## Features

**Shopping**
- Browse products with live search and category filters
- Clean product cards (image, category, price, stock badge) that open a dedicated Product Details page
- Persistent cart (survives page refresh) with quantity controls
- Checkout with delivery details and an order confirmation receipt
- Order history for logged-in users
- Wishlist — add/remove products, synced to your account across devices

**Accounts**
- Register / login with hashed passwords (bcrypt)
- JWT-based authentication on every protected route
- Delete-account support

**Admin Dashboard**
- Dashboard stats: total products, orders, revenue, pending orders
- Full product CRUD (add, edit, delete)
- Order management with status updates (Pending → Processing → Shipping → Delivered)
- Protected by role-based access control (admin-only routes enforced server-side)

**Engineering details**
- Server recalculates order totals and checks stock — never trusts client-submitted prices
- Order creation wrapped in a database transaction (no partial/broken orders)
- Parameterized SQL queries throughout (no SQL injection surface)
- Responsive across mobile, tablet, and desktop
- Accessible markup: semantic HTML, keyboard navigation, ARIA labels, focus states

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express |
| Database | PostgreSQL (hosted on [Neon](https://neon.tech)) |
| Auth | JWT, bcrypt |
| Frontend Hosting | [Netlify](https://www.netlify.com/) |
| Backend Hosting | [Railway](https://railway.app/) |

---

## Deployment

This project is deployed across three services:

| Service | Role | Platform |
|---|---|---|
| **Frontend** | Static site (HTML/CSS/JS) | [Netlify](https://www.netlify.com/) |
| **Backend** | Express API server | [Railway](https://railway.app/) |
| **Database** | PostgreSQL | [Neon](https://neon.tech) (serverless Postgres) |

### Backend on Railway
- The repo root contains both `backend/` and `frontend/`, so Railway's **Root Directory** is set to `/backend` (Settings → Source → Root Directory).
- Start command comes from `package.json`: `"start": "node server.js"`.
- All environment variables (see below) are set under the service's **Variables** tab — Railway does not read the local `.env` file.

### Database on Neon
- Neon provides a hosted PostgreSQL instance with a pooled connection endpoint.
- The connection string from Neon's dashboard is broken into individual `DB_*` variables (see Environment Variables) to match how `db.js` builds its connection.
- SSL is required for Neon connections (`DB_SSL=true`).

### Frontend on Netlify
- Deployed from the `frontend/` directory as a static site (Netlify's **Base directory** / **Publish directory** is set to `frontend`).
- Each HTML file points to the live Railway backend URL via:
```html
<script>
  window.CLICK_CART_API_BASE = window.CLICK_CART_API_BASE || "https://your-backend.up.railway.app";
</script>
```

---

## Project Structure

```
click-cart/
├── backend/
│   ├── server.js          # Express app & all API routes
│   ├── db.js              # PostgreSQL (Neon) connection pool
│   ├── package.json
│   └── .env               # Environment variables (not committed)
└── frontend/
    ├── index.html         # Landing page (hero, categories, about, login/register)
    ├── shop.html           # Product listing (search, filters, cart)
    ├── product.html        # Product details page (wishlist, add to cart)
    ├── admin.html          # Admin dashboard (products, orders, stats)
    ├── style.css           # Single shared stylesheet
    ├── images/             # Product & UI images
    └── js/
        ├── index.js       # Landing page logic
        ├── shop.js         # Product listing + cart + wishlist modal
        ├── product.js      # Product details + wishlist toggle
        └── admin.js        # Admin CRUD + order management
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A PostgreSQL database (local or hosted, e.g. [Neon](https://neon.tech))

### 1. Clone the repo
```bash
git clone https://github.com/SanaAslamDev/E-commerce.git
cd E-commerce
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with:
```
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_PORT=5432
DB_SSL=true
JWT_SECRET=your_random_secret_string
PORT=5000
FRONTEND_URL=http://127.0.0.1:5500
```

> If using **Neon**, get these values by splitting the connection string from your Neon dashboard (Connection Details → Pooled connection) into `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.

Create the required tables (`users`, `products`, `orders`, `order_items`, `wishlist`) in your database — run the SQL below in the Neon SQL Editor (or any Postgres client connected to your database) — then start the server:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  category VARCHAR(100),
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(150),
  phone VARCHAR(30),
  address TEXT,
  total NUMERIC(10,2),
  status VARCHAR(30) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER,
  price NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);
```

```bash
npm start
```

### 3. Frontend setup
Inside the `frontend/` folder, open `index.html`, `shop.html`, `admin.html`, and `product.html` — each has a small inline config script:
```html
<script>
  window.CLICK_CART_API_BASE = window.CLICK_CART_API_BASE || "http://localhost:5000";
</script>
```
Point this at your backend URL (local, or your deployed **Railway** URL), then serve the frontend with any static server (e.g. VS Code Live Server) or open the files directly.

---

## Environment Variables

Set the same variables in both your local `backend/.env` file and in **Railway → Variables** for production:

| Variable | Description |
|---|---|
| `DB_HOST` | Neon database host (e.g. `ep-xxxxx-pooler.region.aws.neon.tech`) |
| `DB_USER` | Neon database username |
| `DB_PASSWORD` | Neon database password |
| `DB_NAME` | Neon database name |
| `DB_PORT` | Postgres port, typically `5432` |
| `DB_SSL` | Must be `true` for Neon |
| `JWT_SECRET` | Random secret string for signing JWTs |
| `PORT` | Port the server listens on (Railway sets this automatically) |
| `FRONTEND_URL` | URL of the deployed frontend, e.g. your Netlify URL, for CORS |

---

## Security Notes

- Passwords are hashed with bcrypt — never stored or returned in plaintext
- All admin and user-specific routes require a valid JWT, verified server-side
- Users can only access/modify their own orders, wishlist, and account
- Order totals and stock are recalculated server-side at checkout, never trusted from the client

---

## Author

**Sana Aslam**

[🔗 Live Demo](https://clickcart01.netlify.app/) · [GitHub Profile](https://github.com/SanaAslamDev) · [Repository](https://github.com/SanaAslamDev/E-commerce)
