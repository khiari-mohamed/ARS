-- Add prediction logs table for AI audit trail
CREATE TABLE IF NOT EXISTS "prediction_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "endpoint" TEXT NOT NULL,
  "input_data" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "prediction_logs_endpoint_idx" ON "prediction_logs"("endpoint");
CREATE INDEX IF NOT EXISTS "prediction_logs_user_id_idx" ON "prediction_logs"("user_id");
CREATE INDEX IF NOT EXISTS "prediction_logs_created_at_idx" ON "prediction_logs"("created_at");