# 🚀 Vercel Deployment & Submission Guide

Follow this guide to deploy your project to **Vercel** with **Neon PostgreSQL** and prepare your assignment submission.

---

## 1. Neon PostgreSQL Setup (Free)

1. Go to [https://neon.tech](https://neon.tech) and create an account / log in.
2. Click **Create Project** -> Name: `courier-logistics-db`.
3. Select region: **Singapore (ap-southeast-1)** or **Frankfurt (eu-central-1)** for fast latency.
4. Copy the **Direct Connection String** (it looks like):
   ```text
   postgresql://neondb_owner:npg_xxxx@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Apply migrations and seed your Neon database from your terminal:
   ```bash
   DATABASE_URL="your_neon_connection_string" npx prisma db push
   DATABASE_URL="your_neon_connection_string" npm run seed
   ```

---

## 2. Upstash Redis Setup (Free Serverless Redis)

1. Go to [https://upstash.com](https://upstash.com) and log in with GitHub.
2. Click **Create Database** -> Name: `courier-redis` -> Region: same as Neon.
3. In database details, copy:
   - **Endpoint / Host** (e.g., `us1-fair-xxxx.upstash.io`)
   - **Port** (`6379`)
   - **Password**

---

## 3. Deploy to Vercel

1. Push your latest commits to GitHub:
   ```bash
   git push origin main
   ```
2. Log in to [https://vercel.com](https://vercel.com).
3. Click **Add New** -> **Project** -> Select `raskirayhan/Industry-Standard-Project`.
4. Framework Preset: **Other**.
5. Under **Environment Variables**, add the following:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...@neon.tech/neondb?sslmode=require` | Your Neon connection string |
| `NODE_ENV` | `production` | App mode |
| `PORT` | `5000` | Port |
| `APP_URL` | `https://your-app.vercel.app` | Production URL |
| `BCRYPT_SALT_ROUNDS` | `12` | Hashing rounds |
| `JWT_ACCESS_SECRET` | `super_secret_access_token_random_32_chars` | Access secret |
| `JWT_REFRESH_SECRET` | `super_secret_refresh_token_random_32_chars` | Refresh secret |
| `JWT_ACCESS_EXPIRES_IN` | `1d` | Expiration |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Expiration |
| `ADMIN_NAME` | `Super Admin` | Seed Admin Name |
| `ADMIN_EMAIL` | `admin@courier.com` | Demo Admin Email |
| `ADMIN_PASSWORD` | `Admin@123456` | Demo Admin Password |
| `REDIS_HOST` | `your-redis.upstash.io` | Upstash Redis Host |
| `REDIS_PORT` | `6379` | Upstash Redis Port |
| `REDIS_USER` | `default` | Upstash User |
| `REDIS_PASSWORD` | `your-upstash-password` | Upstash Password |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe Test Secret Key |
| `STRIPE_WEBHOOK_KEY` | `whsec_...` | Stripe Webhook Secret |

6. Click **Deploy**. Vercel will run `npm run vercel-build` and deploy your serverless API!

---

## 4. Video Walkthrough Checklist (5–10 Minutes)

Record using **OBS** or **Loom**:

- [ ] **Architecture (1 min)**: Explain Route -> Controller -> Service -> Prisma structure. Mention Neon PostgreSQL and Upstash Redis.
- [ ] **Customer Flow (2 mins)**:
  - Register & Login (show JWT token).
  - Calculate shipping cost (`POST /shipments/calculate-price`).
  - Book parcel (`POST /shipments`).
- [ ] **Stripe Payment Flow (2 mins)**:
  - Create payment session (`POST /payments/initiate`).
  - Open Stripe Checkout link in browser.
  - Complete payment and show webhook moving parcel to `PAID` with generated `deliveryOtp`.
- [ ] **Admin & Courier RBAC (2 mins)**:
  - Login as Admin -> Assign courier to shipment (`POST /shipments/:id/assign-courier`).
  - Login as Courier -> Advance delivery (`PICKED_UP` -> `OUT_FOR_DELIVERY`).
  - Enter customer OTP to complete `DELIVERED` status.
- [ ] **Validation & Error Handling (1.5 mins)**:
  - Trigger 401 Unauthorized (request without token).
  - Trigger 403 Forbidden (Customer attempting `POST /hubs`).
  - Trigger 400 Bad Request (invalid email or missing fields).
- [ ] **Technical Challenge Solved (1 min)**:
  - Mention volumetric pricing algorithm, Prisma ACID transactions for delivery status logs, and Redis caching for hubs.
