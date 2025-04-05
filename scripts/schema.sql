-- Initial Setup
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);

-- Database Creation (for initialization only)
DROP DATABASE IF EXISTS repairradar;
CREATE DATABASE repairradar WITH ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';
ALTER DATABASE repairradar OWNER TO postgres;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- For gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis; -- For GEOGRAPHY type

-- Schema Creation
CREATE SCHEMA IF NOT EXISTS public;
ALTER SCHEMA public OWNER TO postgres;
COMMENT ON SCHEMA public IS 'CMMS multi-tenant schema for your application';

-- Enum Types
CREATE TYPE asset_status AS ENUM ('OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE', 'DECOMMISSIONED');
CREATE TYPE call_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE call_status AS ENUM ('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED');
CREATE TYPE industry_type AS ENUM ('MANUFACTURING', 'HEALTHCARE', 'FACILITY', 'LABORATORY', 'ENERGY', 'TRANSPORTATION', 'OTHER');
CREATE TYPE maintenance_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');
CREATE TYPE maintenance_trigger AS ENUM ('TIME_BASED', 'METER_BASED');
CREATE TYPE user_role AS ENUM ('TECHNICIAN', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE work_order_status AS ENUM ('PENDING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- Functions
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

-- Tables
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$')
);

CREATE TABLE asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry industry_type NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_category_per_tenant UNIQUE (tenant_id, name)
);

CREATE TABLE asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES asset_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  expected_lifespan INTERVAL,
  maintenance_frequency INTERVAL,
  criticality INTEGER CHECK (criticality >= 1 AND criticality <= 5),
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_type_per_tenant UNIQUE (tenant_id, name)
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_type_id UUID REFERENCES asset_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location GEOGRAPHY(Point),
  status asset_status NOT NULL DEFAULT 'OPERATIONAL',
  serial_number TEXT UNIQUE,
  purchase_date DATE,
  last_maintenance_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- e.g., 'hours', 'cycles', 'miles'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE asset_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
  initial_reading DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_asset_meter UNIQUE (asset_id, meter_id)
);

CREATE TABLE meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_meter_id UUID NOT NULL REFERENCES asset_meters(id) ON DELETE CASCADE,
  reading_value DECIMAL(15,2) NOT NULL,
  reading_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT reading_value_positive CHECK (reading_value >= 0)
);

CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  trigger_type maintenance_trigger NOT NULL DEFAULT 'TIME_BASED',
  recurrence JSONB, -- e.g., {"interval": "1 month", "days": [1]}
  meter_id UUID REFERENCES meters(id) ON DELETE SET NULL,
  threshold_value DECIMAL(15,2), -- Usage threshold for meter-based maintenance
  next_run TIMESTAMPTZ,
  last_run TIMESTAMPTZ,
  assigned_team UUID[] REFERENCES users(id),
  status maintenance_status DEFAULT 'SCHEDULED',
  priority call_priority DEFAULT 'MEDIUM',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE maintenance_assets (
  maintenance_id UUID REFERENCES maintenance_schedules(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (maintenance_id, asset_id)
);

CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  maintenance_id UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status work_order_status DEFAULT 'PENDING',
  priority call_priority DEFAULT 'MEDIUM',
  assigned_to UUID[] REFERENCES users(id),
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE work_order_assets (
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (work_order_id, asset_id)
);

CREATE TABLE work_order_parts (
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
  quantity_used INTEGER NOT NULL CHECK (quantity_used > 0),
  PRIMARY KEY (work_order_id, part_id)
);

CREATE TABLE work_order_labor (
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  hours DECIMAL(5,2) NOT NULL CHECK (hours > 0),
  task_description TEXT,
  PRIMARY KEY (work_order_id, user_id)
);

CREATE TABLE work_order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  part_number TEXT UNIQUE,
  description TEXT,
  quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
  min_stock INTEGER DEFAULT 0 CHECK (min_stock >= 0),
  unit_cost DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_info JSONB, -- e.g., {"phone": "...", "email": "..."}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE part_vendors (
  part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  cost DECIMAL(10,2) NOT NULL,
  lead_time INTERVAL,
  PRIMARY KEY (part_id, vendor_id)
);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status call_status DEFAULT 'OPEN',
  priority call_priority DEFAULT 'MEDIUM',
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_assets_tenant_status ON assets(tenant_id, status);
CREATE INDEX idx_assets_location ON assets USING GIST (location);
CREATE INDEX idx_meters_tenant ON meters(tenant_id);
CREATE INDEX idx_meter_readings_date ON meter_readings(reading_date);
CREATE INDEX idx_maintenance_schedules_next_run ON maintenance_schedules(next_run);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_parts_quantity ON parts(quantity);
CREATE INDEX idx_incidents_status ON incidents(status);

-- Triggers
CREATE TRIGGER update_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_timestamp_assets BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_timestamp_meters BEFORE UPDATE ON meters FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_timestamp_asset_meters BEFORE UPDATE ON asset_meters FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_timestamp_maintenance BEFORE UPDATE ON maintenance_schedules FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_timestamp_work_orders BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_timestamp_parts BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_timestamp_vendors BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_timestamp_incidents BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER enforce_tenant_assets BEFORE INSERT OR UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION enforce_tenant_isolation();
CREATE TRIGGER enforce_tenant_users BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION enforce_tenant_isolation();
CREATE TRIGGER enforce_tenant_meters BEFORE INSERT OR UPDATE ON meters FOR EACH ROW EXECUTE FUNCTION enforce_tenant_isolation();
CREATE TRIGGER enforce_tenant_maintenance BEFORE INSERT OR UPDATE ON maintenance_schedules FOR EACH ROW EXECUTE FUNCTION enforce_tenant_isolation();
CREATE TRIGGER enforce_tenant_work_orders BEFORE INSERT OR UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION enforce_tenant_isolation();
CREATE TRIGGER enforce_tenant_parts BEFORE INSERT OR UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION enforce_tenant_isolation();
CREATE TRIGGER enforce_tenant_vendors BEFORE INSERT OR UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION enforce_tenant_isolation();
CREATE TRIGGER enforce_tenant_incidents BEFORE INSERT OR UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION enforce_tenant_isolation();

-- Row-Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON tenants FOR ALL USING (
  (SELECT role FROM users WHERE id = current_setting('app.current_user_id')::UUID) = 'SUPER_ADMIN'
  OR tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID)
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_access ON users FOR ALL USING (
  (SELECT role FROM users WHERE id = current_setting('app.current_user_id')::UUID) = 'SUPER_ADMIN'
  OR tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID)
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_access ON assets FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID)
);

ALTER TABLE meters ENABLE ROW LEVEL SECURITY;
CREATE POLICY meter_access ON meters FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID)
);

ALTER TABLE asset_meters ENABLE ROW LEVEL SECURITY;
CREATE POLICY asset_meter_access ON asset_meters FOR ALL USING (
  EXISTS (SELECT 1 FROM assets WHERE id = asset_meters.asset_id AND tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID))
);

ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY meter_reading_access ON meter_readings FOR ALL USING (
  EXISTS (SELECT 1 FROM asset_meters am JOIN assets a ON am.asset_id = a.id WHERE am.id = meter_readings.asset_meter_id AND a.tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID))
);

ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY maintenance_access ON maintenance_schedules FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID)
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY work_order_access ON work_orders FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID)
);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY parts_access ON parts FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID)
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_access ON vendors FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID)
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY incident_access ON incidents FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id')::UUID)
);

-- Note: Additional RLS policies for junction tables (e.g., maintenance_assets, work_order_assets) can be added as needed based on specific access requirements.