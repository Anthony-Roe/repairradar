SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
DROP DATABASE IF EXISTS postgres;
CREATE DATABASE postgres WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';
ALTER DATABASE postgres OWNER TO postgres;
\connect postgres
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
COMMENT ON DATABASE postgres IS 'default administrative connection database';
ALTER DATABASE postgres SET "app.settings.jwt_exp" TO '3600';
\connect postgres
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO pg_database_owner;
COMMENT ON SCHEMA public IS 'standard public schema';
CREATE TYPE public.asset_status AS ENUM (
 'operational',
 'maintenance',
 'out_of_service'
);
ALTER TYPE public.asset_status OWNER TO postgres;
CREATE TYPE public.call_priority AS ENUM (
 'low',
 'medium',
 'high',
 'critical'
);
ALTER TYPE public.call_priority OWNER TO postgres;
CREATE TYPE public.call_status AS ENUM (
 'OPEN',
 'IN_PROGRESS',
 'CLOSED'
);
ALTER TYPE public.call_status OWNER TO postgres;
CREATE TYPE public.industry_classification AS ENUM (
 'MANUFACTURING',
 'HEALTHCARE',
 'FACILITY',
 'LABORATORY',
 'ENERGY',
 'TRANSPORTATION'
);
ALTER TYPE public.industry_classification OWNER TO postgres;
CREATE TYPE public.maintenance_status AS ENUM (
 'SCHEDULED',
 'IN_PROGRESS',
 'COMPLETED',
 'OVERDUE'
);
ALTER TYPE public.maintenance_status OWNER TO postgres;
CREATE TYPE public.priority_level AS ENUM (
 'LOW',
 'MEDIUM',
 'HIGH',
 'CRITICAL'
);
ALTER TYPE public.priority_level OWNER TO postgres;
CREATE TYPE public.user_role AS ENUM (
 'TECHNICIAN',
 'MANAGER',
 'ADMIN',
 'SUPER_ADMIN'
);
ALTER TYPE public.user_role OWNER TO postgres;
CREATE TYPE public.work_order_status AS ENUM (
 'PENDING',
 'IN_PROGRESS',
 'COMPLETED',
 'CANCELLED'
);
ALTER TYPE public.work_order_status OWNER TO postgres;
CREATE FUNCTION public.check_tenant_access(user_id uuid, tenant_id uuid) RETURNS boolean
 LANGUAGE sql SECURITY DEFINER
 AS $_$
 
 SELECT EXISTS (SELECT 1 FROM users WHERE id = $1 AND role = 'SUPER_ADMIN')
 
 
 OR EXISTS (SELECT 1 FROM users WHERE id = $1 AND users.tenant_id = $2)
$_$;
ALTER FUNCTION public.check_tenant_access(user_id uuid, tenant_id uuid) OWNER TO postgres;
CREATE FUNCTION public.get_current_user_tenant() RETURNS uuid
 LANGUAGE plpgsql SECURITY DEFINER
 AS $$
BEGIN
  RETURN (SELECT tenant_id FROM users WHERE id = auth.uid());
END;
$$;
ALTER FUNCTION public.get_current_user_tenant() OWNER TO postgres;
CREATE FUNCTION public.set_tenant_context() RETURNS uuid
 LANGUAGE plpgsql SECURITY DEFINER
 AS $$
DECLARE
  user_tenant_id UUID;
BEGIN
  -- Get user's tenant_id
  SELECT tenant_id INTO user_tenant_id 
  FROM users 
  WHERE id = auth.uid();
  
  -- If SUPER_ADMIN and no tenant specified, return NULL (full access)
  IF (SELECT role FROM users WHERE id = auth.uid()) = 'SUPER_ADMIN' THEN
    RETURN NULL;
  END IF;
  
  -- Set context variable
  PERFORM set_config('app.current_tenant_id', user_tenant_id::text, true);
  
  RETURN user_tenant_id;
END;
$$;
ALTER FUNCTION public.set_tenant_context() OWNER TO postgres;
CREATE FUNCTION public.update_timestamp() RETURNS trigger
 LANGUAGE plpgsql
 AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.update_timestamp() OWNER TO postgres;
SET default_tablespace = '';
SET default_table_access_method = heap;
CREATE TABLE public.asset_categories (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 tenant_id uuid NOT NULL,
 name text NOT NULL,
 industry public.industry_classification NOT NULL,
 description text,
 color_code character varying(7),
 icon character varying(50),
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.asset_categories OWNER TO postgres;
CREATE TABLE public.asset_types (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 tenant_id uuid NOT NULL,
 category_id uuid,
 name text NOT NULL,
 description text,
 expected_lifespan interval,
 maintenance_frequency interval,
 criticality_level integer,
 custom_fields jsonb,
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now(),
 CONSTRAINT asset_types_criticality_level_check CHECK (((criticality_level >= 1) AND (criticality_level <= 5)))
);
ALTER TABLE public.asset_types OWNER TO postgres;
CREATE TABLE public.assets (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 tenant_id uuid NOT NULL,
 name text NOT NULL,
 location text,
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now(),
 deleted_at timestamp with time zone,
 status public.asset_status DEFAULT 'operational'::public.asset_status NOT NULL,
 type text,
 last_maintenance_date timestamp with time zone,
 image_url text,
 asset_type_id uuid,
 custom_category text,
 CONSTRAINT created_at_past_check CHECK ((created_at <= now()))
);
ALTER TABLE public.assets OWNER TO postgres;
CREATE TABLE public.calls (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 tenant_id uuid NOT NULL,
 asset_id uuid NOT NULL,
 reported_by_id uuid,
 issue text NOT NULL,
 call_time timestamp with time zone DEFAULT now(),
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now(),
 deleted_at timestamp with time zone,
 status public.call_status DEFAULT 'OPEN'::public.call_status
);
ALTER TABLE public.calls OWNER TO postgres;
CREATE TABLE public.maintenance_assets (
 maintenance_id uuid NOT NULL,
 asset_id uuid NOT NULL
);
ALTER TABLE public.maintenance_assets OWNER TO postgres;
CREATE TABLE public.maintenance_schedules (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 tenant_id uuid NOT NULL,
 description text NOT NULL,
 recurrence jsonb,
 next_run timestamp with time zone NOT NULL,
 last_run timestamp with time zone,
 assigned_to_id uuid,
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now(),
 deleted_at timestamp with time zone,
 status public.maintenance_status DEFAULT 'SCHEDULED'::public.maintenance_status,
 priority public.priority_level DEFAULT 'MEDIUM'::public.priority_level
);
ALTER TABLE public.maintenance_schedules OWNER TO postgres;
CREATE TABLE public.part_vendors (
 part_id uuid NOT NULL,
 vendor_id uuid NOT NULL,
 cost double precision
);
ALTER TABLE public.part_vendors OWNER TO postgres;
CREATE TABLE public.parts (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 name text NOT NULL,
 description text,
 quantity integer DEFAULT 0,
 min_stock integer DEFAULT 0,
 tenant_id uuid NOT NULL,
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now(),
 deleted_at timestamp with time zone
);
ALTER TABLE public.parts OWNER TO postgres;
CREATE TABLE public.tenant_configs (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 tenant_id uuid,
 modules jsonb,
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now(),
 deleted_at timestamp with time zone,
 floor_plans jsonb
);
ALTER TABLE public.tenant_configs OWNER TO postgres;
CREATE TABLE public.tenants (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 name text NOT NULL,
 subdomain text NOT NULL,
 parent_id uuid,
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now(),
 deleted_at timestamp with time zone
);
ALTER TABLE public.tenants OWNER TO postgres;
CREATE TABLE public.users (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 tenant_id uuid NOT NULL,
 email text NOT NULL,
 password text NOT NULL,
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now(),
 deleted_at timestamp with time zone,
 role text NOT NULL,
 CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['TECHNICIAN'::text, 'MANAGER'::text, 'ADMIN'::text, 'SUPER_ADMIN'::text]))),
 CONSTRAINT valid_email_check CHECK ((email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'::text))
);
ALTER TABLE public.users OWNER TO postgres;
CREATE TABLE public.vendors (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 name text NOT NULL,
 contact text,
 email text,
 tenant_id uuid NOT NULL,
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now(),
 deleted_at timestamp with time zone
);
ALTER TABLE public.vendors OWNER TO postgres;
CREATE TABLE public.work_order_assets (
 work_order_id uuid NOT NULL,
 asset_id uuid NOT NULL
);
ALTER TABLE public.work_order_assets OWNER TO postgres;
CREATE TABLE public.work_order_notes (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 work_order_id uuid,
 note text NOT NULL,
 created_by_id uuid,
 created_at timestamp with time zone DEFAULT now(),
 deleted_at timestamp with time zone
);
ALTER TABLE public.work_order_notes OWNER TO postgres;
CREATE TABLE public.work_orders (
 id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
 tenant_id uuid NOT NULL,
 description text NOT NULL,
 created_at timestamp with time zone DEFAULT now(),
 updated_at timestamp with time zone DEFAULT now(),
 assigned_to_id uuid,
 deleted_at timestamp with time zone,
 due_date timestamp with time zone,
 status public.work_order_status DEFAULT 'PENDING'::public.work_order_status,
 priority public.priority_level DEFAULT 'MEDIUM'::public.priority_level
);
ALTER TABLE public.work_orders OWNER TO postgres;
ALTER TABLE ONLY public.asset_categories
 ADD CONSTRAINT asset_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.asset_categories
 ADD CONSTRAINT asset_categories_tenant_id_name_key UNIQUE (tenant_id, name);
ALTER TABLE ONLY public.asset_types
 ADD CONSTRAINT asset_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.asset_types
 ADD CONSTRAINT asset_types_tenant_id_name_key UNIQUE (tenant_id, name);
ALTER TABLE ONLY public.assets
 ADD CONSTRAINT assets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.calls
 ADD CONSTRAINT calls_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.maintenance_assets
 ADD CONSTRAINT maintenance_assets_pkey PRIMARY KEY (maintenance_id, asset_id);
ALTER TABLE ONLY public.maintenance_schedules
 ADD CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.part_vendors
 ADD CONSTRAINT part_vendors_pkey PRIMARY KEY (part_id, vendor_id);
ALTER TABLE ONLY public.parts
 ADD CONSTRAINT parts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenant_configs
 ADD CONSTRAINT tenant_configs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenant_configs
 ADD CONSTRAINT tenant_configs_tenant_id_key UNIQUE (tenant_id);
ALTER TABLE ONLY public.tenants
 ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tenants
 ADD CONSTRAINT tenants_subdomain_key UNIQUE (subdomain);
ALTER TABLE ONLY public.users
 ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
 ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vendors
 ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.work_order_assets
 ADD CONSTRAINT work_order_assets_pkey PRIMARY KEY (work_order_id, asset_id);
ALTER TABLE ONLY public.work_order_notes
 ADD CONSTRAINT work_order_notes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.work_orders
 ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);
CREATE INDEX idx_asset_categories_tenant ON public.asset_categories USING btree (tenant_id);
CREATE INDEX idx_asset_types_category ON public.asset_types USING btree (category_id);
CREATE INDEX idx_asset_types_tenant ON public.asset_types USING btree (tenant_id);
CREATE INDEX idx_assets_status ON public.assets USING btree (status);
CREATE INDEX idx_assets_tenant_id ON public.assets USING btree (tenant_id);
CREATE INDEX idx_calls_asset_id ON public.calls USING btree (asset_id);
CREATE INDEX idx_calls_reported_by_id ON public.calls USING btree (reported_by_id);
CREATE INDEX idx_calls_tenant_id ON public.calls USING btree (tenant_id);
CREATE INDEX idx_maintenance_assets_asset_id ON public.maintenance_assets USING btree (asset_id);
CREATE INDEX idx_maintenance_tenant_id ON public.maintenance_schedules USING btree (tenant_id);
CREATE INDEX idx_parts_tenant_id ON public.parts USING btree (tenant_id);
CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);
CREATE INDEX idx_vendors_tenant_id ON public.vendors USING btree (tenant_id);
CREATE INDEX idx_work_order_assets_asset_id ON public.work_order_assets USING btree (asset_id);
CREATE INDEX idx_work_order_notes_created_by_id ON public.work_order_notes USING btree (created_by_id);
CREATE INDEX idx_work_orders_tenant_id ON public.work_orders USING btree (tenant_id);
CREATE INDEX users_role_idx ON public.users USING btree (role);
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.calls FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.maintenance_assets FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.maintenance_schedules FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.part_vendors FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.tenant_configs FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.work_order_assets FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.work_order_notes FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
ALTER TABLE ONLY public.asset_categories
 ADD CONSTRAINT asset_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.asset_types
 ADD CONSTRAINT asset_types_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.asset_categories(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.asset_types
 ADD CONSTRAINT asset_types_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.assets
 ADD CONSTRAINT assets_asset_type_id_fkey FOREIGN KEY (asset_type_id) REFERENCES public.asset_types(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.assets
 ADD CONSTRAINT assets_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.calls
 ADD CONSTRAINT calls_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id);
ALTER TABLE ONLY public.calls
 ADD CONSTRAINT calls_reported_by_id_fkey FOREIGN KEY (reported_by_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.calls
 ADD CONSTRAINT calls_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.maintenance_assets
 ADD CONSTRAINT maintenance_assets_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.maintenance_assets
 ADD CONSTRAINT maintenance_assets_maintenance_id_fkey FOREIGN KEY (maintenance_id) REFERENCES public.maintenance_schedules(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.maintenance_schedules
 ADD CONSTRAINT maintenance_schedules_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.maintenance_schedules
 ADD CONSTRAINT maintenance_schedules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.part_vendors
 ADD CONSTRAINT part_vendors_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.part_vendors
 ADD CONSTRAINT part_vendors_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.parts
 ADD CONSTRAINT parts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.tenant_configs
 ADD CONSTRAINT tenant_configs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.tenants
 ADD CONSTRAINT tenants_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tenants(id);
ALTER TABLE ONLY public.users
 ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.vendors
 ADD CONSTRAINT vendors_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_order_assets
 ADD CONSTRAINT work_order_assets_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_order_assets
 ADD CONSTRAINT work_order_assets_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_order_notes
 ADD CONSTRAINT work_order_notes_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.work_order_notes
 ADD CONSTRAINT work_order_notes_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_orders
 ADD CONSTRAINT work_orders_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.work_orders
 ADD CONSTRAINT work_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE POLICY "Same Tenant Access" ON public.users FOR SELECT TO anon USING ((((auth.jwt() ->> 'role'::text) = 'SUPER_ADMIN'::text) OR (id = auth.uid()) OR (tenant_id = public.get_current_user_tenant())));
CREATE POLICY "Tenants can be deleted by users with appropriate roles" ON public.tenants FOR DELETE TO authenticated USING (((( SELECT users.role
 FROM public.users
 WHERE (users.id = auth.uid())) = 'SUPER_ADMIN'::text) OR (EXISTS ( SELECT 1
 FROM public.users
 WHERE ((users.id = auth.uid()) AND (users.tenant_id = tenants.id))))));
CREATE POLICY "Tenants can be inserted by users with appropriate roles" ON public.tenants FOR INSERT TO authenticated WITH CHECK (((( SELECT users.role
 FROM public.users
 WHERE (users.id = auth.uid())) = 'SUPER_ADMIN'::text) OR (EXISTS ( SELECT 1
 FROM public.users
 WHERE ((users.id = auth.uid()) AND (users.tenant_id = tenants.id))))));
CREATE POLICY "Tenants can be selected by users with appropriate roles" ON public.tenants FOR SELECT TO authenticated USING (((( SELECT users.role
 FROM public.users
 WHERE (users.id = auth.uid())) = 'SUPER_ADMIN'::text) OR (EXISTS ( SELECT 1
 FROM public.users
 WHERE ((users.id = auth.uid()) AND (users.tenant_id = tenants.id))))));
CREATE POLICY "Tenants can be updated by users with appropriate roles" ON public.tenants FOR UPDATE TO authenticated USING (((( SELECT users.role
 FROM public.users
 WHERE (users.id = auth.uid())) = 'SUPER_ADMIN'::text) OR (EXISTS ( SELECT 1
 FROM public.users
 WHERE ((users.id = auth.uid()) AND (users.tenant_id = tenants.id)))))) WITH CHECK (((( SELECT users.role
 FROM public.users
 WHERE (users.id = auth.uid())) = 'SUPER_ADMIN'::text) OR (EXISTS ( SELECT 1
 FROM public.users
 WHERE ((users.id = auth.uid()) AND (users.tenant_id = tenants.id))))));
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY assets_access_policy ON public.assets USING (public.check_tenant_access(auth.uid(), tenant_id));
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY calls_access_policy ON public.calls USING (public.check_tenant_access(auth.uid(), tenant_id));
ALTER TABLE public.maintenance_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY maintenance_assets_access_policy ON public.maintenance_assets USING ((EXISTS ( SELECT 1
 FROM public.maintenance_schedules ms
 WHERE ((ms.id = maintenance_assets.maintenance_id) AND public.check_tenant_access(auth.uid(), ms.tenant_id)))));
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY maintenance_schedules_access_policy ON public.maintenance_schedules USING (public.check_tenant_access(auth.uid(), tenant_id));
ALTER TABLE public.part_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY part_vendors_access_policy ON public.part_vendors USING ((EXISTS ( SELECT 1
 FROM public.parts p
 WHERE ((p.id = part_vendors.part_id) AND public.check_tenant_access(auth.uid(), p.tenant_id)))));
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY parts_access_policy ON public.parts USING (public.check_tenant_access(auth.uid(), tenant_id));
ALTER TABLE public.tenant_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_configs_access_policy ON public.tenant_configs USING (public.check_tenant_access(auth.uid(), tenant_id));
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendors_access_policy ON public.vendors USING (public.check_tenant_access(auth.uid(), tenant_id));
ALTER TABLE public.work_order_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY work_order_assets_access_policy ON public.work_order_assets USING ((EXISTS ( SELECT 1
 FROM public.work_orders wo
 WHERE ((wo.id = work_order_assets.work_order_id) AND public.check_tenant_access(auth.uid(), wo.tenant_id)))));
ALTER TABLE public.work_order_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY work_order_notes_access_policy ON public.work_order_notes USING ((EXISTS ( SELECT 1
 FROM public.work_orders wo
 WHERE ((wo.id = work_order_notes.work_order_id) AND public.check_tenant_access(auth.uid(), wo.tenant_id)))));
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY work_orders_access_policy ON public.work_orders USING (public.check_tenant_access(auth.uid(), tenant_id));
GRANT ALL ON DATABASE postgres TO dashboard_user;
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON FUNCTION public.check_tenant_access(user_id uuid, tenant_id uuid) TO anon;
GRANT ALL ON FUNCTION public.check_tenant_access(user_id uuid, tenant_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_tenant_access(user_id uuid, tenant_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.get_current_user_tenant() TO anon;
GRANT ALL ON FUNCTION public.get_current_user_tenant() TO authenticated;
GRANT ALL ON FUNCTION public.get_current_user_tenant() TO service_role;
GRANT ALL ON FUNCTION public.set_tenant_context() TO anon;
GRANT ALL ON FUNCTION public.set_tenant_context() TO authenticated;
GRANT ALL ON FUNCTION public.set_tenant_context() TO service_role;
GRANT ALL ON FUNCTION public.update_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_timestamp() TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.asset_categories TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.asset_categories TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.asset_categories TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.asset_types TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.asset_types TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.asset_types TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.assets TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.assets TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.assets TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.calls TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.calls TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.calls TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.maintenance_assets TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.maintenance_assets TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.maintenance_assets TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.maintenance_schedules TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.maintenance_schedules TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.maintenance_schedules TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.part_vendors TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.part_vendors TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.part_vendors TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.parts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.parts TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.parts TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenant_configs TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenant_configs TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenant_configs TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenants TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenants TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.tenants TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.vendors TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.vendors TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.vendors TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.work_order_assets TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.work_order_assets TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.work_order_assets TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.work_order_notes TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.work_order_notes TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.work_order_notes TO service_role;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.work_orders TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.work_orders TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.work_orders TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;