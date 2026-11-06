# 🚚 Courier & Logistics Platform - Backend RESTful API

A robust, enterprise-grade Courier & Logistics management platform backend built with **Node.js, Express, TypeScript, PostgreSQL (Prisma ORM), Redis, and Stripe**.

---

## 📌 Submission Overview

- **Project Name**: Courier & Logistics Platform Backend API
- **Repository**: [https://github.com/raskirayhan/Industry-Standard-Project](https://github.com/raskirayhan/Industry-Standard-Project)
- **Live API**: `https://industry-standard-project.vercel.app` (or your deployed Vercel URL)
- **API Documentation**: [`./postman_collection.json`](./postman_collection.json) (Import directly into Postman)
- **Demo Admin Email**: `admin@courier.com`
- **Demo Admin Password**: `Admin@123456`

---

## 🛠️ Tech Stack & Architecture

- **Runtime & Language**: Node.js (ES Modules) & TypeScript
- **Framework**: Express.js 5
- **Database & ORM**: PostgreSQL (Neon Serverless) & Prisma ORM 7 with multi-file modular schemas
- **Caching & OTP Storage**: Redis (Upstash)
- **Authentication**: JWT (Access Token + Refresh Token in HTTP-only Cookies & Bearer header) + Google OAuth 2.0 (GCP)
- **Payment Processing**: Stripe Checkout Sessions & Webhooks
- **Validation**: Zod 3/4 runtime schema validation
- **File & Media Storage**: Cloudinary & Multer (Memory Storage)
- **Email Service**: Nodemailer & EJS Templates

---

## 👥 Role-Based Access Control (RBAC)

The system enforces strict permission boundaries across **3 distinct user roles**:

| Feature / Endpoint | Customer | Courier | Admin |
| :--- | :---: | :---: | :---: |
| **Register & Login** | ✅ | ✅ | ✅ |
| **Manage Own Profile** | ✅ | ✅ | ✅ |
| **Calculate Shipping Price** | ✅ | ✅ | ✅ |
| **Book / Create Parcel** | ✅ | ❌ | ❌ |
| **View Own Shipments** | ✅ (Own) | ❌ | ✅ (All) |
| **Cancel Uncollected Parcel** | ✅ (Own) | ❌ | ✅ |
| **Initiate Stripe Payment** | ✅ (Own) | ❌ | ✅ |
| **Setup Vehicle Profile & Docs** | ❌ | ✅ | ✅ |
| **View Assigned Delivery Runs** | ❌ | ✅ (Assigned) | ✅ (All) |
| **Update Delivery Lifecycle (Pickup, Transit, Out)** | ❌ | ✅ (Assigned) | ✅ |
| **Complete Delivery with OTP (DELIVERED)** | ❌ | ✅ (Assigned) | ✅ |
| **Create & Update Hubs** | ❌ | ❌ | ✅ |
| **Assign Couriers to Paid Parcels** | ❌ | ❌ | ✅ |
| **Manage All Users & Soft Deletes** | ❌ | ❌ | ✅ |

---

## 📦 Core Business Workflows

### 1. Shipment Booking & Dynamic Pricing Formula
- Volumetric weight calculation: `(Length × Width × Height) / 5000`.
- Chargeable weight: `max(actualWeight, volumetricWeight)`.
- Base fare: 60 BDT (intra-zone) / 120 BDT (inter-zone).
- Fragile surcharge: 50 BDT.
- Unique tracking number generation: `TRK-YYYY-XXXXXX`.

### 2. Stripe Payment Flow
1. Customer initiates payment (`POST /api/v1/payments/initiate`).
2. Backend creates Stripe Checkout Session and pending payment record.
3. Upon checkout, Stripe triggers webhook (`POST /api/v1/payments/webhook`).
4. Webhook verifies signature, generates a 6-digit `deliveryOtp`, moves shipment to `PAID`, and logs transaction.

### 3. Courier Delivery Lifecycle & Audit Logs
1. Admin assigns courier (`POST /api/v1/shipments/:id/assign-courier`) -> status `PICKUP_ASSIGNED`.
2. Courier picks up parcel -> status `PICKED_UP`.
3. Parcel moves through transit -> status `IN_HUB_TRANSIT`.
4. Courier departs for delivery -> status `OUT_FOR_DELIVERY`.
5. Courier enters OTP provided by customer -> status `DELIVERED`, courier `activeDeliveries` decremented.
6. Every transition creates an immutable historical audit record in `ShipmentLog`.

---

## 🚀 API Endpoints Summary

### Authentication (`/api/v1/auth`)
- `POST /register` - Register customer account
- `POST /login` - Login with credentials
- `POST /google` - GCP Google OAuth login
- `POST /refresh-token` - Refresh expired access token
- `POST /forgot-password` - Request 6-digit OTP
- `POST /reset-password` - Reset password with OTP

### Hubs (`/api/v1/hubs`)
- `POST /` - Create logistics hub (**Admin only**)
- `GET /` - List all hubs (**Cached with Redis**)
- `GET /:id` - Get hub details
- `PATCH /:id` - Update hub (**Admin only**)
- `DELETE /:id` - Soft-delete hub (**Admin only**)

### Shipments (`/api/v1/shipments`)
- `POST /calculate-price` - Calculate volumetric shipping price
- `POST /` or `POST /create-shipment` - Book shipment (**Customer only**)
- `GET /` or `GET /get-all-shipments` - Filtered shipments list (Role-restricted)
- `GET /:id` - Shipment details + audit logs
- `PATCH /:id` - Update shipment before dispatch
- `POST /:id/cancel` - Cancel booking (Customer owner only)
- `POST /:id/assign-courier` - Assign rider to parcel (**Admin only**)
- `PATCH /:id/status` - Transition delivery state & verify OTP (**Courier / Admin**)

### Payments (`/api/v1/payments`)
- `POST /initiate` - Create Stripe Checkout session (**Customer only**)
- `POST /webhook` - Stripe Webhook handler
- `GET /:id` - Payment status lookup

---

## ⚙️ Local Setup Guide

1. **Clone repository**:
   ```bash
   git clone https://github.com/raskirayhan/Industry-Standard-Project.git
   cd Industry-Standard-Project
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## 🌐 Deploy to Vercel with Neon PostgreSQL

1. Push all code to GitHub.
2. Sign in to **[Neon](https://neon.tech)** and create a new project. Copy the connection string.
3. Sign in to **[Vercel](https://vercel.com)**:
   - Click **Add New Project** -> Select `Industry-Standard-Project`.
   - In **Environment Variables**, paste all keys from your `.env`:
     - `DATABASE_URL` (your Neon connection string)
     - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
     - `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
     - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (from [Upstash](https://upstash.com))
     - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_KEY`
   - Click **Deploy**.
4. Run migrations on Neon:
   ```bash
   DATABASE_URL="your-neon-url" npx prisma db push
   ```
