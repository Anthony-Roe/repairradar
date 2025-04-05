-- Create utility functions

CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_tenant_isolation() RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME != 'tenants' AND NEW.tenant_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = NEW.tenant_id) THEN
      RAISE EXCEPTION 'Invalid tenant_id: %', NEW.tenant_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;