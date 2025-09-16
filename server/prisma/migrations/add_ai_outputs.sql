-- Create AI outputs table for comprehensive AI learning and audit
CREATE TABLE IF NOT EXISTS "ai_outputs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "endpoint" TEXT NOT NULL,
  "input_data" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "user_id" TEXT NOT NULL,
  "confidence" DECIMAL(5,4),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "ai_outputs_endpoint_idx" ON "ai_outputs"("endpoint");
CREATE INDEX IF NOT EXISTS "ai_outputs_user_id_idx" ON "ai_outputs"("user_id");
CREATE INDEX IF NOT EXISTS "ai_outputs_created_at_idx" ON "ai_outputs"("created_at");
CREATE INDEX IF NOT EXISTS "ai_outputs_confidence_idx" ON "ai_outputs"("confidence");
CREATE INDEX IF NOT EXISTS "ai_outputs_endpoint_confidence_idx" ON "ai_outputs"("endpoint", "confidence");

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ai_outputs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_outputs_updated_at
    BEFORE UPDATE ON "ai_outputs"
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_outputs_updated_at();