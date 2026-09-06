ALTER TABLE license
  ADD COLUMN IF NOT EXISTS polar_product_id varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS uq_license_polar_product_id
  ON license (polar_product_id)
  WHERE polar_product_id IS NOT NULL;

ALTER TABLE payment
  ADD COLUMN IF NOT EXISTS provider varchar(20) NOT NULL DEFAULT 'MANUAL';

ALTER TABLE payment
  DROP CONSTRAINT IF EXISTS ck_payment_provider;

ALTER TABLE payment
  ADD CONSTRAINT ck_payment_provider CHECK (provider IN ('POLAR', 'MANUAL'));

ALTER TABLE payment
  ADD COLUMN IF NOT EXISTS polar_checkout_id varchar(64);

ALTER TABLE payment
  ADD COLUMN IF NOT EXISTS polar_order_id varchar(64);

ALTER TABLE payment
  ADD COLUMN IF NOT EXISTS polar_subscription_id varchar(64);

ALTER TABLE payment
  ADD COLUMN IF NOT EXISTS currency varchar(3) NOT NULL DEFAULT 'USD';

ALTER TABLE payment
  DROP CONSTRAINT IF EXISTS ck_payment_currency;

ALTER TABLE payment
  ADD CONSTRAINT ck_payment_currency CHECK (currency IN ('KRW', 'USD'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_polar_checkout_id
  ON payment (polar_checkout_id)
  WHERE polar_checkout_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_polar_order_id
  ON payment (polar_order_id)
  WHERE polar_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_payment_polar_subscription_id
  ON payment (polar_subscription_id)
  WHERE polar_subscription_id IS NOT NULL;

ALTER TABLE purchased_license
  ADD COLUMN IF NOT EXISTS polar_subscription_id varchar(64);

ALTER TABLE purchased_license
  ADD COLUMN IF NOT EXISTS polar_order_id varchar(64);

ALTER TABLE purchased_license
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_purchased_license_polar_subscription_id
  ON purchased_license (polar_subscription_id)
  WHERE polar_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_purchased_license_polar_order_id
  ON purchased_license (polar_order_id)
  WHERE polar_order_id IS NOT NULL AND polar_subscription_id IS NULL;

CREATE TABLE IF NOT EXISTS polar_webhook_event (
  event_id varchar(128) PRIMARY KEY,
  event_type varchar(80) NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
