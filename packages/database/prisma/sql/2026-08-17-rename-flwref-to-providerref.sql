-- Renames the legacy Flutterwave column to a provider-neutral name.
-- Uses RENAME COLUMN so existing charge references are preserved.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'flwRef'
  ) THEN
    ALTER TABLE "Order" RENAME COLUMN "flwRef" TO "providerRef";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'PaymentLog' AND column_name = 'flwRef'
  ) THEN
    ALTER TABLE "PaymentLog" RENAME COLUMN "flwRef" TO "providerRef";
  END IF;
END $$;
