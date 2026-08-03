CREATE TABLE IF NOT EXISTS ai_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '総合',
  question_text TEXT NOT NULL,
  highlights_json TEXT NOT NULL DEFAULT '[]',
  feedback_json TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_mode ON ai_sessions (mode);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_created_at ON ai_sessions (created_at DESC);

-- 課金エンタイトルメント（Stripe / Apple StoreKit 共通）
-- 識別アンカー: 一人の「支払い者」を跨プラットフォームで解決する中心行。
-- 最初に届いた方（Stripe webhook か Apple 検証）から遅延生成される。
CREATE TABLE IF NOT EXISTS entitlement_accounts (
  id TEXT PRIMARY KEY,
  email TEXT,
  apple_original_transaction_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlement_accounts_email
  ON entitlement_accounts (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlement_accounts_apple_otid
  ON entitlement_accounts (apple_original_transaction_id) WHERE apple_original_transaction_id IS NOT NULL;

-- 匿名デバイス/ブラウザ識別子。多対1でアカウントに紐づく。
CREATE TABLE IF NOT EXISTS entitlement_devices (
  device_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES entitlement_accounts(id),
  platform TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entitlement_devices_account ON entitlement_devices (account_id);

-- 実際の購読/購入記録。Stripeのsubscriptionまたは
-- AppleのoriginalTransactionIdごとに1行。
CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES entitlement_accounts(id),
  source TEXT NOT NULL,
  product_id TEXT NOT NULL,
  external_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end INTEGER,
  auto_renew_status INTEGER,
  last_event TEXT,
  raw_payload_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_source_external
  ON entitlements (source, external_subscription_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_account ON entitlements (account_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON entitlements (status);

-- StripeとAppleどちらのWebhook再送に対しても冪等性を担保する監査ログ。
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  payload_json TEXT NOT NULL
);
