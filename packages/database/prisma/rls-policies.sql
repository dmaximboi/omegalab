-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- De-Omega Labaffairs Database
-- ============================================
-- 
-- IMPORTANT: Run this SQL in Neon Console after schema is created
-- Go to: Neon Console > Your Project > SQL Editor
--
-- These policies ensure:
-- 1. Users can only see their own data
-- 2. Admins can see all data
-- 3. No direct table access without proper authentication
-- ============================================

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentLog" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER TABLE POLICIES
-- ============================================

-- Users can only read their own record
CREATE POLICY "users_read_own" ON "User"
  FOR SELECT
  USING (id = current_setting('app.current_user_id', true));

-- Only backend can insert/update users (no direct user access)
CREATE POLICY "users_backend_insert" ON "User"
  FOR INSERT
  WITH CHECK (current_setting('app.is_backend', true) = 'true');

CREATE POLICY "users_backend_update" ON "User"
  FOR UPDATE
  USING (current_setting('app.is_backend', true) = 'true');

-- ============================================
-- PRODUCT TABLE POLICIES (Public read, Admin write)
-- ============================================

-- Anyone can read active products
CREATE POLICY "products_public_read" ON "Product"
  FOR SELECT
  USING ("isActive" = true OR current_setting('app.is_admin', true) = 'true');

-- Only admins can insert/update/delete products
CREATE POLICY "products_admin_write" ON "Product"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true');

-- ============================================
-- ORDER TABLE POLICIES
-- ============================================

-- Users can only see their own orders
CREATE POLICY "orders_read_own" ON "Order"
  FOR SELECT
  USING (
    "userId" = current_setting('app.current_user_id', true)
    OR current_setting('app.is_admin', true) = 'true'
  );

-- Backend only for order creation
CREATE POLICY "orders_backend_insert" ON "Order"
  FOR INSERT
  WITH CHECK (current_setting('app.is_backend', true) = 'true');

-- ============================================
-- NOTIFICATION TABLE POLICIES
-- ============================================

-- Users can only see their own notifications
CREATE POLICY "notifications_read_own" ON "Notification"
  FOR SELECT
  USING ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- ADMIN-ONLY TABLES
-- ============================================

-- Contact messages - admin only
CREATE POLICY "contact_admin_only" ON "ContactMessage"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true');

-- Audit logs - admin only
CREATE POLICY "audit_admin_only" ON "AuditLog"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true');

-- Security events - admin only
CREATE POLICY "security_admin_only" ON "SecurityEvent"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true');

-- Rate limit logs - admin only
CREATE POLICY "ratelimit_admin_only" ON "RateLimitLog"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true');

-- Payment logs - admin only
CREATE POLICY "payment_admin_only" ON "PaymentLog"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true');

-- ============================================
-- FORCE RLS FOR ALL ROLES (including owner)
-- ============================================

ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Order" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ContactMessage" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SecurityEvent" FORCE ROW LEVEL SECURITY;

-- ============================================
-- REVOKE DIRECT ACCESS FROM PUBLIC
-- ============================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- Grant only to authenticated role (your app's connection)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO neondb_owner;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO neondb_owner;
