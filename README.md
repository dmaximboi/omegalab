# De-Omega Labaffairs Nig. Ltd. — Full Stack Website

> **For Windsurf AI:** This is the complete engineering specification for the De-Omega Labaffairs website. Read every section before generating any code. Do not mock, hardcode, demo, or expose any credentials, secrets, or sensitive values anywhere in the codebase. All secrets live exclusively in `.env` files.

---

## Project Overview

A production-grade, PWA-installable, full-stack web application for **De-Omega Labaffairs Nig. Ltd.** — a Nigerian company specializing in procurement, sales, installation, and maintenance of laboratory, medical, scientific, and factory equipment.

**Domain:** `omegalabaffairs.com` (placeholder — update in `.env`)
**Stack:** Next.js 14 (App Router) · Turso (libSQL) · Prisma ORM · Uploadthing · Bachs · NextAuth.js · Upstash Redis · Sharp · QRCode · node-cron

---

## Aesthetic & UI Direction

- **Style:** Flat, clean, institutional SPA feel — similar to ClassMe. No gradients, no shadows overload, no busyness.
- **Colors:** Navy blue `#0A1F5C` · Sky blue `#00AAFF` · White `#FFFFFF` · Light grey `#F4F6FA` (backgrounds)
- **Typography:** `DM Sans` (body) · `Syne` (headings) — import from Google Fonts
- **Icons:** Maximum 2% icon usage — only where functionally necessary (cart, bell, menu, close). No decorative icons.
- **Layout:** Single Page Application feel. Smooth scroll between sections. No page reloads for navigation between Home, Catalogue, Contact, About.
- **Grid:** Catalogue uses Jumia-style product grid — image dominant, price label below, clean card borders.
- **Animations:** Subtle fade-in on scroll only. No bouncing, no excessive motion.
- **Mobile first:** Fully responsive. Works perfectly on low-end Android phones.

---

## Repository Structure

```
de-omega-labaffairs/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                  # Home / landing (SPA scroll)
│   │   ├── catalogue/
│   │   │   └── page.tsx              # Product catalogue grid
│   │   ├── product/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Single product detail (5 images, description)
│   │   ├── contact/
│   │   │   └── page.tsx              # Contact form page
│   │   └── receipt/
│   │       └── [orderId]/
│   │           └── page.tsx          # Receipt page (post-payment)
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── page.tsx              # Admin dashboard
│   │   │   ├── products/
│   │   │   │   ├── page.tsx          # Product list + CRUD
│   │   │   │   ├── new/page.tsx      # Add new product
│   │   │   │   └── [id]/page.tsx     # Edit product
│   │   │   ├── orders/
│   │   │   │   └── page.tsx          # Orders list
│   │   │   ├── messages/
│   │   │   │   └── page.tsx          # Contact form messages inbox
│   │   │   ├── verify-qr/
│   │   │   │   └── page.tsx          # QR code scanner + order verification
│   │   │   └── notifications/
│   │   │       └── page.tsx          # Send notifications to users
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts          # NextAuth Google OAuth
│   │   ├── products/
│   │   │   ├── route.ts              # GET all products (public)
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET single product (public)
│   │   ├── admin/
│   │   │   ├── products/
│   │   │   │   ├── route.ts          # POST create product (admin only)
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # PUT/DELETE product (admin only)
│   │   │   ├── orders/
│   │   │   │   └── route.ts          # GET all orders (admin only)
│   │   │   └── verify-order/
│   │   │       └── route.ts          # POST verify QR hash (admin only)
│   │   ├── orders/
│   │   │   ├── initiate/
│   │   │   │   └── route.ts          # POST initiate order (auth required)
│   │   │   └── verify/
│   │   │       └── route.ts          # POST multi-layer payment verification
│   │   ├── contact/
│   │   │   └── route.ts              # POST contact form submission
│   │   ├── notifications/
│   │   │   └── route.ts              # GET user notifications (auth required)
│   │   ├── webhooks/
│   │   │   └── bachs/
│   │   │       └── route.ts          # POST Bachs webhook (signature + timestamp verified)
│   │   ├── upload/
│   │   │   └── route.ts              # POST image upload (admin only, sharp compress)
│   │   └── cron/
│   │       └── keepalive/
│   │           └── route.ts          # GET cron keepalive ping
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                           # Reusable UI components
│   ├── Navbar.tsx
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   ├── ContactForm.tsx
│   ├── NotificationBell.tsx
│   ├── Receipt.tsx
│   ├── QRScanner.tsx                 # Admin QR scanner
│   └── AdminGuard.tsx
├── lib/
│   ├── db.ts                         # Turso + Prisma client
│   ├── auth.ts                       # NextAuth config
│   ├── bachs.ts                      # Bachs server-side client
│   ├── fx.ts                         # Server-only NGN -> USD quoting
│   ├── hash.ts                       # SHA-256 + salt hashing utilities
│   ├── uploadthing.ts                # Uploadthing server config
│   ├── redis.ts                      # Upstash Redis client
│   ├── rateLimit.ts                  # Rate limiting middleware
│   ├── notifications.ts              # Notification helpers
│   └── cron.ts                       # Cron job setup
├── middleware.ts                     # Global route protection + security headers
├── prisma/
│   └── schema.prisma                 # Full Prisma schema
├── public/
│   ├── manifest.json                 # PWA manifest
│   └── sw.js                         # Service worker
├── .env.example                      # Template — never commit real .env
├── .gitignore                        # Must include .env, .env.local
└── README.md
```

---

## Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String?
  image         String?
  role          Role           @default(USER)
  createdAt     DateTime       @default(now())
  orders        Order[]
  notifications Notification[]
}

enum Role {
  USER
  ADMIN
}

model Product {
  id          String         @id @default(cuid())
  name        String
  description String
  price       Decimal        // Always server-side authoritative
  category    String
  images      ProductImage[]
  orders      OrderItem[]
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model ProductImage {
  id        String  @id @default(cuid())
  url       String  // Uploadthing URL only — no base64, no blobs
  order     Int     // 1 = primary display image
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Order {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id])
  items           OrderItem[]
  totalAmount     Decimal
  status          OrderStatus @default(PENDING)
  providerRef     String?     // Bachs charge/payment id
  txRef           String      @unique // Our internal tx reference
  receiptHash     String      @unique // SHA-256 + salt hash for QR
  paymentVerified Boolean     @default(false)
  verifiedAt      DateTime?
  verifiedBy      String?     // Admin user ID who verified
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

enum OrderStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
  REFUNDED
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id])
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Decimal // Snapshot of price at time of order — immutable
}

model ContactMessage {
  id             String          @id @default(cuid())
  name           String
  email          String
  phone          String
  address        String
  reason         ContactReason
  reasonOther    String?         // If reason = OTHER, max 500 chars
  message        String
  senderType     SenderType
  senderOther    String?         // If senderType = OTHER, max 500 chars
  responseMethod ResponseMethod
  isRead         Boolean         @default(false)
  createdAt      DateTime        @default(now())
}

enum ContactReason {
  ORDER
  BUSINESS
  PARTNERSHIP
  OTHER
}

enum SenderType {
  SCHOOL
  COMPANY
  BUSINESS_PARTNER
  OTHER
}

enum ResponseMethod {
  EMAIL
  CALL
  WHATSAPP
  IN_APP
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  type      NotificationType
  title     String
  body      String
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())
}

enum NotificationType {
  NEW_PRODUCT
  PRICE_CHANGE
  ORDER_UPDATE
  ADMIN_MESSAGE
}

model AuditLog {
  id         String   @id @default(cuid())
  adminId    String
  action     String   // e.g. "PRODUCT_PRICE_UPDATE", "ORDER_STATUS_CHANGE"
  entityId   String
  oldValue   String?  // JSON stringified previous state
  newValue   String?  // JSON stringified new state
  createdAt  DateTime @default(now())
}
```

---

## Pages Specification

### Public Pages

#### `/` — Home (SPA Landing Page)
Single scrollable page with smooth anchor navigation. Sections in order:
1. **Hero** — Company name, tagline, two CTAs: "Browse Catalogue" + "Contact Us"
2. **About** — Short company description, mission, vision (from company profile)
3. **Services** — 6 service cards: Procurement, Construction/Rehab, Factory Equipment, Consultancy, Installation & Repair, Staff Training
4. **Clients** — Logos or text list of notable institutional clients (UNILORIN, LAUTECH, LASU, etc.)
5. **CTA Banner** — "Ready to equip your lab?" with link to catalogue

Navbar links: **Home · Catalogue · Contact · About** — all smooth scroll or SPA route. Notification bell top-right (visible only to authenticated users). No hamburger on desktop.

---

#### `/catalogue` — Product Catalogue
- Jumia-style grid layout: 4 columns desktop, 2 columns mobile
- Each card: primary product image (dominant) + product name + price label
- Filter bar: by category (dropdown)
- Search bar: client-side filter by name
- Clicking a card navigates to `/product/[id]`
- No price visible in the DOM before server response — fetched server-side

---

#### `/product/[id]` — Product Detail
- Image gallery: up to 5 images, primary image large, thumbnails below
- Product name, full description, price
- Quantity selector
- "Order Now" button — triggers Google sign-in if not authenticated, then proceeds to Bachs hosted checkout
- Related products section (same category)

---

#### `/contact` — Contact Form
Full structured form with these fields:

| Field | Type | Notes |
|---|---|---|
| Full Name | Text input | Required |
| Phone Number | Tel input | Required |
| Email Address | Email input | Required |
| Address | Text input | Required |
| Reason for Contact | Dropdown | ORDER / BUSINESS / PARTNERSHIP / OTHER |
| Reason (if OTHER) | Textarea | Max 500 chars, shown conditionally |
| Message | Textarea | Required, "Tell us what you want" |
| Where are you messaging from? | Dropdown | SCHOOL / COMPANY / BUSINESS PARTNER / OTHER |
| Specify (if OTHER) | Textarea | Max 500 chars, shown conditionally |
| Preferred Response Method | Radio/Checkbox | Gmail Response / Call / WhatsApp / In-App Response |

- Honeypot hidden field (bot trap, never shown to real users)
- Google reCAPTCHA v3 on submit
- Rate limited: max 3 submissions per IP per hour
- Zod validation both frontend and server-side
- DOMPurify sanitization on all text fields before save

---

#### `/receipt/[orderId]` — Receipt Page
Only accessible to the authenticated user who placed the order and to admins.

Receipt layout (print-friendly):
```
DE-OMEGA LABAFFAIRS NIG. LTD.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Receipt No: [orderId]
Date: [createdAt]
Customer: [name + email]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ITEMS ORDERED:
[Product Name]         ₦[unitPrice] x [qty]
[Product Name]         ₦[unitPrice] x [qty]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:                 ₦[totalAmount]
Payment Status:        PAID / PENDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[QR CODE — contains salted SHA-256 hash]
"Scan this code for order verification"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

QR code contains **only the salted hash string** — no PII, no amounts. Admin scans it to verify.

---

### Admin Pages (all behind `/admin` prefix, role = ADMIN required)

#### `/admin` — Dashboard
- Summary cards: total orders, pending orders, total products, unread messages
- Recent orders table
- Quick links to all admin sections

#### `/admin/products` — Product Management
- Full product list with inline status toggle (active/inactive)
- Add New Product button → `/admin/products/new`
- Edit/Delete actions per product
- Instant CRUD — no page reload, optimistic UI confirmed by server response
- Soft delete only (isActive = false) with confirmation dialog

#### `/admin/products/new` and `/admin/products/[id]` — Product Form
Fields:
- Product name
- Category
- Description
- Price (server-side only write — never editable from client JS directly)
- Images: upload up to 5, minimum 1. Drag to reorder. Image 1 = primary.
- Active toggle

On price change → audit log entry created + notification sent to all users with `PRICE_CHANGE` type.
On new product → notification sent to all users with `NEW_PRODUCT` type.

#### `/admin/orders` — Orders Management
- Full orders list with status, amount, customer, date
- Filter by status
- Click order to see full detail including items

#### `/admin/messages` — Contact Inbox
- List of all contact form submissions
- Mark as read
- Reply triggers notification to user (if they selected IN_APP response)

#### `/admin/verify-qr` — QR Verification
- Camera-based QR scanner (use `html5-qrcode` library)
- On scan: sends hash to `/api/admin/verify-order`
- Backend checks hash against DB (with salt verification)
- Returns: order status, customer name, items ordered, payment state
- Admin sees clear VERIFIED ✓ or INVALID ✗ result
- Admin can manually mark order as verified from this screen

---

## API Routes Specification

### `POST /api/orders/initiate`
**Auth required (USER or ADMIN)**

Request body:
```json
{
  "items": [
    { "productId": "clxxx", "quantity": 2 }
  ]
}
```

Server-side logic:
1. Validate session — reject if unauthenticated
2. Zod validate request body
3. Fetch product prices from DB — **never trust client price**
4. Calculate total server-side
5. Generate unique `txRef` = `DOMG-[timestamp]-[nanoid]`
6. Generate `receiptHash`:
   ```
   salt = crypto.randomBytes(32).toString('hex')
   hash = SHA-256(txRef + userId + totalAmount + salt)
   store salt + hash in DB
   ```
7. Create Order record in DB with status PENDING
8. Lock an NGN→USD FX quote server-side and create a Bachs hosted checkout session with the server-computed USD amount

---

### `POST /api/orders/verify`
**Payment token or order owner required — called after the Bachs redirect**

The client sends only `orderId`. The checkout session id is read from the database, never from the request body.

Multi-layer verification:
1. Validate payment token (timing-safe) or authenticated order owner
2. **Layer 1:** Check order exists and is not already verified
3. **Layer 2:** Re-fetch the checkout session from the Bachs API (server-to-server, using the secret key)
4. **Layer 3:** Require session status completed and an explicit success payment status
5. **Layer 4:** Compare returned amount and currency against the locked USD quote in the DB
6. **Layer 5:** Require `reference` and `metadata.order_id` to match the order
7. **Layer 6:** Idempotent write — `updateMany` guarded on `paymentVerified: false`
8. On all layers pass → status PAID, `paymentVerified = true`, `verifiedAt = now()`

---

### `POST /api/webhooks/bachs`
**No auth — but strict signature verification**

1. Read the raw request body before any parsing
2. Compute HMAC-SHA256 over `timestamp.rawBody` using `BACHS_WEBHOOK_SECRET`
3. Compare using `crypto.timingSafeEqual`, and reject timestamps older than 300s (replay guard)
4. Reject events whose `organization_id` does not match `BACHS_ORG_ID`
5. Deduplicate on `WebhookEvent.id` — an event is processed at most once
6. Run the same server-to-server verification as the callback path before fulfilling
7. Return 200 quickly

---

### `POST /api/upload`
**Admin only**

1. Verify admin session server-side
2. Accept image file (multipart/form-data)
3. Reject if MIME type not in `['image/jpeg', 'image/png', 'image/webp']`
4. Reject if file size > 1MB
5. Process with Sharp:
   ```
   sharp(buffer)
     .resize({ width: 1200, withoutEnlargement: true })
     .webp({ quality: 75 })
     .withMetadata(false)   // strips all EXIF data
     .toBuffer()
   ```
6. Upload compressed buffer to Uploadthing
7. Save returned URL to DB
8. Return URL

---

### `POST /api/admin/verify-order`
**Admin only**

1. Verify admin session
2. Receive hash string from QR scan
3. Fetch order from DB where `receiptHash = hash`
4. Re-derive hash using stored salt to confirm integrity:
   ```
   expected = SHA-256(txRef + userId + totalAmount + storedSalt)
   compare with stored hash using timingSafeEqual
   ```
5. Return full order details + verification status to admin

---

### `GET /api/cron/keepalive`
**Internal — secured with `CRON_SECRET` header check**

- Pings DB with a lightweight query (`SELECT 1`)
- Returns 200 OK
- Called by external cron service (cron-job.org or Upstash QStash) every 5 minutes
- Keeps Vercel serverless functions warm, Turso DB active, prevents any cold starts

---

## Security Implementation (56 Layers)

### Authentication & Authorization
1. Google OAuth only via NextAuth.js — no password auth
2. JWT with 1-hour expiry + rotating refresh tokens
3. RBAC — USER / ADMIN enforced on every protected route
4. Server-side session check on every API route (never trust client role claims)
5. Admin routes protected by `middleware.ts` checking role from DB — not just JWT
6. RLS enforced via Prisma middleware — users can only read their own orders/notifications

### Input Validation & Sanitization
7. Zod schema on every API route — request rejected if schema fails
8. Zod schema on every form (frontend) before submission
9. DOMPurify on all user-generated text before DB write
10. Contact textarea hard limit: 500 characters enforced frontend + server
11. Image MIME type whitelist — checked server-side, not by extension alone
12. File size hard limit: 1MB enforced before Sharp processing
13. Sharp strips all EXIF metadata from every uploaded image
14. Prisma parameterized queries — zero raw SQL anywhere

### Hashing & Cryptography
15. Receipt hash: `SHA-256(txRef + userId + totalAmount + salt)` — salted per order
16. Salt generated with `crypto.randomBytes(32)` — stored separately in DB
17. All hash comparisons use `crypto.timingSafeEqual` — prevents timing attacks
18. Bachs webhook: HMAC-SHA256 verification of the raw payload plus timestamp
19. Session tokens: signed + encrypted with `NEXTAUTH_SECRET`
20. Cookies: HTTP-only, Secure, SameSite=Strict

### Payment Security
21. Product price never accepted from client — always fetched from DB server-side
22. Total amount computed server-side — Bachs receives the server-computed amount only
23. Idempotency keys on all payment initiations
24. Multi-layer post-payment verification (see `/api/orders/verify`)
25. Webhook signature verification via HMAC-SHA256 + `timingSafeEqual` + timestamp replay window
26. Server-to-server Bachs re-verification after webhook receipt
27. Amount cross-check: Bachs returned amount vs the locked USD quote in the DB
28. Checkout session id is read from the DB only — never accepted from the browser
29. Provider error text is logged server-side and never returned to the browser
30. txRef tamper check before marking any order as paid
31. Duplicate payment guard — reject if order already PAID

### API Security
30. Rate limiting on all routes via Upstash Redis:
    - Contact form: 3 req/hour per IP
    - Auth: 10 req/15min per IP
    - Order initiation: 20 req/hour per user
    - General API: 100 req/min per IP
31. CSRF protection on all mutating routes
32. API routes never return stack traces or internal error messages to client
33. All admin API routes reject non-ADMIN sessions with 403 (not 401 — no info leakage)

### HTTP Headers (set in `middleware.ts`)
34. `Content-Security-Policy` — strict, whitelist only known domains
35. `X-Frame-Options: DENY`
36. `X-Content-Type-Options: nosniff`
37. `Referrer-Policy: strict-origin-when-cross-origin`
38. `Permissions-Policy: camera=(), microphone=(), geolocation=()`
39. `Strict-Transport-Security: max-age=63072000; includeSubDomains`
40. `CORS` — whitelist production domain only, no wildcard

### Bot & Spam Protection
41. Honeypot hidden field on contact form — submissions with it filled = auto-rejected
42. Google reCAPTCHA v3 on contact form submission
43. Google reCAPTCHA v3 on order initiation

### CRUD Protection
44. All product writes require verified ADMIN session
45. Price updates trigger immutable audit log entry (oldValue, newValue, adminId, timestamp)
46. Soft delete only — `isActive = false`, never hard delete without explicit confirmation
47. Optimistic UI updates validated against actual server response before committing to state
48. Admin session idle timeout: re-verification required after 30 minutes inactivity

### PWA & Service Worker
49. SW scope limited — never intercepts `/api`, `/admin`, or payment routes
50. Cache-Control: no-store on all API responses
51. SW caches only: static assets, fonts, public catalogue HTML
52. No sensitive data stored in SW cache or IndexedDB

### Environment & Secrets
53. All secrets in `.env.local` — never in source code, never in client bundle
54. `NEXT_PUBLIC_` prefix used only for the app URL and reCAPTCHA site key — no payment or FX secret is ever exposed to the client
55. `.gitignore` strictly excludes all `.env*` files
56. `npm audit` runs in CI pipeline — build fails on high severity vulnerabilities

---

## Notification System

**Trigger events:**
- New product added → notify all Users: "New product available: [name]"
- Product price changed → notify all Users: "Price update: [product name] is now ₦[newPrice]"
- Order status changed → notify order owner: "Your order [id] is now [status]"
- Admin sends message → notify specific user

**How it works:**
- Notifications stored in `Notification` table in Turso
- `NotificationBell` component polls `/api/notifications` every 30 seconds (authenticated users only)
- Unread count shown on bell icon (top-right navbar)
- Clicking bell opens dropdown list of notifications
- Mark as read on click
- Bell not rendered at all for unauthenticated users

---

## QR Code & Receipt System

**On order PAID:**
1. Generate `salt = crypto.randomBytes(32).toString('hex')`
2. Generate `receiptHash = SHA256(txRef + userId + totalAmount.toString() + salt)`
3. Store both `salt` and `receiptHash` in Order record
4. Generate QR code image from `receiptHash` string using `qrcode` npm package
5. Render QR on receipt page

**Admin verification flow:**
1. Admin goes to `/admin/verify-qr`
2. Camera opens (html5-qrcode)
3. Scans QR → extracts hash string
4. POST to `/api/admin/verify-order` with hash
5. Server fetches order by hash, re-derives hash using stored salt, compares with `timingSafeEqual`
6. Returns: customer name, items, quantities, unit prices, total, payment status, verifiedAt
7. Admin sees clear result + can mark as manually verified

---

## PWA Configuration

**`public/manifest.json`:**
```json
{
  "name": "De-Omega Labaffairs",
  "short_name": "De-Omega",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A1F5C",
  "theme_color": "#00AAFF",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service Worker (`public/sw.js`):**
- Cache strategy: Cache-First for static assets, Network-First for API
- Never cache: `/api/*`, `/admin/*`, `/receipt/*`
- Offline fallback page for non-cached routes
- Background sync for failed contact form submissions (no sensitive data)

---

## Cron Job — Keep Alive

**Purpose:** Prevent Vercel serverless cold starts, keep Turso DB connection warm, ensure site is always fast.

**Implementation:**
- External cron service (cron-job.org — free) pings `GET /api/cron/keepalive` every **5 minutes**
- Route verifies `Authorization: Bearer ${CRON_SECRET}` header before executing
- Executes: lightweight DB ping + returns 200
- Also use `node-cron` inside the app for internal scheduled tasks (e.g. cleanup of old PENDING orders after 24 hours)

---

## Performance & Scale

- **Target:** Handle 500 concurrent transactions
- Next.js App Router server components — minimal client JS bundle
- Turso handles concurrent reads well — connection pooling via libSQL driver
- Upstash Redis for rate limiting — handles burst traffic without DB pressure
- Uploadthing CDN serves all images — zero image load on your server
- Vercel Edge Network — global CDN for static assets
- All product listing pages use Next.js `revalidate` ISR — cached, not server-rendered on every request
- Payment verification runs async — webhook updates DB, user gets redirect to receipt
- Order initiation API: idempotent — safe to retry without double-charging

---

## Environment Variables (`.env.example`)

```env
# Database
DATABASE_URL=

# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Bachs
BACHS_API_KEY=
BACHS_WEBHOOK_SECRET=
BACHS_ORG_ID=
BACHS_MODE=
PAYMENT_CURRENCY=USD
RECEIPT_SECRET=

# FX (NGN -> USD)
FX_RATE_API_URL=
FX_RATE_API_KEY=
FX_FALLBACK_NGN_PER_USD=
FX_BUFFER_PERCENT=2
FX_MIN_NGN_PER_USD=
FX_MAX_NGN_PER_USD=

# Uploadthing
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# Cron
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=
ADMIN_EMAILS=
```

> `ADMIN_EMAILS` — comma-separated list of Google emails that get ADMIN role on first login. Set this before launch. Never hardcode it.

---

## Key Rules for Windsurf

1. **Never hardcode any secret, API key, or credential** — always read from `process.env`
2. **Never accept price from client** — always compute server-side from DB
3. **Never use base64 for image storage** — Uploadthing URL strings only in DB
4. **Never use raw SQL** — Prisma ORM only
5. **Never expose admin routes to USER role** — check role from DB on every admin API call
6. **Never trust the Bachs webhook alone** — always cross-verify server-to-server
7. **Always use `crypto.timingSafeEqual`** for any hash or secret comparison
8. **Always salt receipt hashes** — `crypto.randomBytes(32)` per order
9. **Always strip EXIF** from images via Sharp before upload
10. **Always run Zod** on both frontend and backend for every form and API input
11. **Soft delete only** — never hard delete products without explicit admin confirmation
12. **Audit log every** price change and admin CRUD action
13. **Service worker must never** intercept payment, auth, or admin routes
14. **Notification bell renders only** for authenticated users
15. **QR verification page is admin-only** — no user can access `/admin/verify-qr`