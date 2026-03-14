# KC Pride — Full Stack E-Commerce Backend

> Production-ready Node.js + Express backend for KC Pride formal shirts.
> Uses **Supabase (PostgreSQL)** as database, Razorpay for payments, Nodemailer for emails, and Twilio for WhatsApp notifications.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | Supabase (PostgreSQL) |
| ORM / Client | @supabase/supabase-js |
| Payments | Razorpay (UPI, Cards, NetBanking, COD) |
| Email | Nodemailer (Gmail SMTP) |
| WhatsApp | Twilio |
| Auth | JWT (JSON Web Tokens) |
| Hosting | Railway / Render (free tier) |

---

## Features

- Real payment processing with Razorpay + server-side HMAC signature verification
- Full order lifecycle: placed → confirmed → processing → shipped → delivered
- Beautiful HTML email receipts sent automatically via Nodemailer
- Instant WhatsApp alert to shop owner + customer confirmation via Twilio
- Public order tracking endpoint (customers track by Order ID)
- Protected admin REST API — view all orders, filter, update status, send notifications
- COD (Cash on Delivery) support
- Coupon/discount codes saved per order

---

## Project Structure

```
kcpride-backend/
├── server.js                    # Express app, middleware, routes
├── .env.example                 # All environment variables with instructions
├── package.json
│
├── config/
│   ├── supabase.js              # Supabase client (uses service key)
│   └── schema.sql               # ← Run this in Supabase SQL Editor first!
│
├── models/
│   └── Order.js                 # All Supabase DB queries (create, read, update)
│
├── routes/
│   ├── payment.js               # POST /create-order  POST /verify
│   └── orders.js                # Tracking + admin CRUD endpoints
│
├── middleware/
│   └── auth.js                  # JWT admin protection
│
└── utils/
    ├── email.js                 # Order confirmation + status update emails
    ├── whatsapp.js              # Twilio WhatsApp notifications
    └── frontend-integration.js  # Drop-in placeOrder() for your HTML files
```

---

## Setup (Step by Step)

### Step 1 — Create Supabase project (free)
1. Go to [supabase.com](https://supabase.com) → New Project
2. Go to **SQL Editor** → New Query → paste entire contents of `config/schema.sql` → Run
3. Go to **Settings → API** → copy `URL`, `anon key`, and `service_role key`

### Step 2 — Create Razorpay account (free)
1. Go to [razorpay.com](https://razorpay.com) → Sign Up
2. Dashboard → Settings → API Keys → Generate Test Keys
3. Copy `Key ID` and `Key Secret`

### Step 3 — Configure environment
```bash
cp .env.example .env
# Fill in all values in .env
```

### Step 4 — Install and run
```bash
npm install
npm run dev     # Development
npm start       # Production
```

### Step 5 — Test it's working
```
GET http://localhost:5000/api/health
```
Should return: `{ "database": "✅ Supabase connected" }`

---

## API Reference

### Payment (Public)
| Method | Route | Description |
|---|---|---|
| POST | `/api/payment/create-order` | Create Razorpay order + save to Supabase |
| POST | `/api/payment/verify` | Verify signature, confirm payment, send notifications |

### Orders (Public)
| Method | Route | Description |
|---|---|---|
| GET | `/api/orders/track/:orderId` | Customer order tracking |

### Admin (JWT required)
| Method | Route | Description |
|---|---|---|
| POST | `/api/orders/admin/login` | Login → returns JWT token |
| GET | `/api/orders/admin/all` | All orders (filter by status, search, paginate) |
| GET | `/api/orders/admin/stats` | Dashboard stats |
| PATCH | `/api/orders/admin/:orderId/status` | Update status + notify customer |

---

## Database Tables (Supabase)

**orders** — one row per order (customer info, delivery, payment, status)

**order_items** — one row per shirt in an order (linked to orders.order_id)

**order_status_history** — every status change with timestamp and note

---

## Connect to Your HTML Frontend

1. Add Razorpay script in `<head>`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```
2. Copy `utils/frontend-integration.js` content into your HTML `<script>` block
3. Replace the existing `placeOrder()` function with the new one
4. Change `API_BASE` to your live server URL after deployment

---

## Deploy to Railway (free)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
Add all `.env` variables in Railway Dashboard → Variables tab.

---

## Resume Description

> **KC Pride E-Commerce Backend** — Full-stack REST API built with Node.js and Express, using Supabase (PostgreSQL) for persistent data storage. Implements Razorpay payment gateway with server-side HMAC-SHA256 signature verification, automated HTML email receipts via Nodemailer, real-time WhatsApp notifications via Twilio, JWT-protected admin dashboard, and public order tracking. Deployed on Railway.
