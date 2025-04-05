-- Initialize database and extensions
DO $$ 
BEGIN


SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE asset_status AS ENUM ('OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE', 'DECOMMISSIONED');

CREATE TYPE call_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE call_status AS ENUM ('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED');

CREATE TYPE industry_type AS ENUM ('MANUFACTURING', 'HEALTHCARE', 'FACILITY', 'LABORATORY', 'ENERGY', 'TRANSPORTATION', 'OTHER');

CREATE TYPE maintenance_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

CREATE TYPE maintenance_trigger AS ENUM ('TIME_BASED', 'METER_BASED');

CREATE TYPE user_role AS ENUM ('TECHNICIAN', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN');

CREATE TYPE work_order_status AS ENUM ('PENDING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

SET NULL,
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

SET NULL,
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

SET NULL,
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

SET NULL,
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

SET NULL,
  hours DECIMAL(5,2) NOT NULL CHECK (hours > 0),
  task_description TEXT,
  PRIMARY KEY (work_order_id, user_id)
);

SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

SET NULL,
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
END $$;