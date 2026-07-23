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
| Database | PostgreSQL |
| Auth | JWT, bcrypt |
| Hosting | Netlify (frontend) |

---

## Project Structure

```
click-cart/
├── index.html          # Landing page (hero, categories, about, login/register)
├── shop.html            # Product listing (search, filters, cart)
├── product.html          # Product details page (wishlist, add to cart)
├── admin.html            # Admin dashboard (products, orders, stats)
├── style.css              # Single shared stylesheet
├── js/
│   ├── index.js          # Landing page logic
│   ├── shop.js            # Product listing + cart + wishlist modal
│   ├── product.js          # Product details + wishlist toggle
│   └── admin.js            # Admin CRUD + order management
└── backend/
    ├── server.js          # Express app & all API routes
    ├── db.js              # PostgreSQL connection pool
    ├── package.json
    └── .env               # Environment variables (not committed)
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

Create the required tables (`users`, `products`, `orders`, `order_items`, `wishlist`) in your database, then start the server:
```bash
npm start
```

### 3. Frontend setup
Open `index.html`, `shop.html`, `admin.html`, and `product.html` — each has a small inline config script:
```html
<script>
  window.CLICK_CART_API_BASE = window.CLICK_CART_API_BASE || "http://localhost:5000";
</script>
```
Point this at your backend URL, then serve the frontend with any static server (e.g. VS Code Live Server) or open the files directly.

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
