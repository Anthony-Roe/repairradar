--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-03-29 15:59:27

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

--
-- TOC entry 865 (class 1247 OID 22200)
-- Name: CallStatus; Type: TYPE; Schema: public; Owner: ar_master
--

CREATE TYPE public."CallStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'CLOSED'
);


ALTER TYPE public."CallStatus" OWNER TO ar_master;

--
-- TOC entry 877 (class 1247 OID 22236)
-- Name: MaintenancePriority; Type: TYPE; Schema: public; Owner: ar_master
--

CREATE TYPE public."MaintenancePriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public."MaintenancePriority" OWNER TO ar_master;

--
-- TOC entry 874 (class 1247 OID 22226)
-- Name: MaintenanceStatus; Type: TYPE; Schema: public; Owner: ar_master
--

CREATE TYPE public."MaintenanceStatus" AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'OVERDUE'
);


ALTER TYPE public."MaintenanceStatus" OWNER TO ar_master;

--
-- TOC entry 862 (class 1247 OID 22193)
-- Name: UserRole; Type: TYPE; Schema: public; Owner: ar_master
--

CREATE TYPE public."UserRole" AS ENUM (
    'USER',
    'ADMIN',
    'SUPER_ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO ar_master;

--
-- TOC entry 871 (class 1247 OID 22218)
-- Name: WorkOrderPriority; Type: TYPE; Schema: public; Owner: ar_master
--

CREATE TYPE public."WorkOrderPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public."WorkOrderPriority" OWNER TO ar_master;

--
-- TOC entry 868 (class 1247 OID 22208)
-- Name: WorkOrderStatus; Type: TYPE; Schema: public; Owner: ar_master
--

CREATE TYPE public."WorkOrderStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."WorkOrderStatus" OWNER TO ar_master;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 22268)
-- Name: Asset; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."Asset" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    location text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Asset" OWNER TO ar_master;

--
-- TOC entry 222 (class 1259 OID 22276)
-- Name: Call; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."Call" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "assetId" text NOT NULL,
    "reportedById" text NOT NULL,
    issue text NOT NULL,
    "callTime" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."CallStatus" DEFAULT 'OPEN'::public."CallStatus" NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."Call" OWNER TO ar_master;

--
-- TOC entry 227 (class 1259 OID 22321)
-- Name: MaintenanceAsset; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."MaintenanceAsset" (
    "maintenanceId" text NOT NULL,
    "assetId" text NOT NULL
);


ALTER TABLE public."MaintenanceAsset" OWNER TO ar_master;

--
-- TOC entry 226 (class 1259 OID 22311)
-- Name: MaintenanceSchedule; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."MaintenanceSchedule" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    description text NOT NULL,
    recurrence jsonb NOT NULL,
    "nextRun" timestamp(3) without time zone NOT NULL,
    "lastRun" timestamp(3) without time zone,
    status public."MaintenanceStatus" DEFAULT 'SCHEDULED'::public."MaintenanceStatus" NOT NULL,
    priority public."MaintenancePriority" DEFAULT 'MEDIUM'::public."MaintenancePriority" NOT NULL,
    "assignedToId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."MaintenanceSchedule" OWNER TO ar_master;

--
-- TOC entry 228 (class 1259 OID 22328)
-- Name: Part; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."Part" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    quantity integer DEFAULT 0 NOT NULL,
    "minStock" integer DEFAULT 0 NOT NULL,
    "tenantId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."Part" OWNER TO ar_master;

--
-- TOC entry 230 (class 1259 OID 22346)
-- Name: PartVendor; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."PartVendor" (
    "partId" text NOT NULL,
    "vendorId" text NOT NULL,
    cost double precision
);


ALTER TABLE public."PartVendor" OWNER TO ar_master;

--
-- TOC entry 219 (class 1259 OID 22251)
-- Name: TenantConfig; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."TenantConfig" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    modules jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."TenantConfig" OWNER TO ar_master;

--
-- TOC entry 218 (class 1259 OID 22243)
-- Name: Tenants; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."Tenants" (
    id text NOT NULL,
    name text NOT NULL,
    subdomain text NOT NULL,
    "parentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."Tenants" OWNER TO ar_master;

--
-- TOC entry 220 (class 1259 OID 22259)
-- Name: User; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "tenantId" text,
    email text NOT NULL,
    password text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL
);


ALTER TABLE public."User" OWNER TO ar_master;

--
-- TOC entry 229 (class 1259 OID 22338)
-- Name: Vendor; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."Vendor" (
    id text NOT NULL,
    name text NOT NULL,
    contact text,
    email text,
    "tenantId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."Vendor" OWNER TO ar_master;

--
-- TOC entry 223 (class 1259 OID 22286)
-- Name: WorkOrder; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."WorkOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    description text NOT NULL,
    status public."WorkOrderStatus" DEFAULT 'PENDING'::public."WorkOrderStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "assignedToId" text,
    "deletedAt" timestamp(3) without time zone,
    "dueDate" timestamp(3) without time zone,
    priority public."WorkOrderPriority" DEFAULT 'MEDIUM'::public."WorkOrderPriority" NOT NULL
);


ALTER TABLE public."WorkOrder" OWNER TO ar_master;

--
-- TOC entry 224 (class 1259 OID 22296)
-- Name: WorkOrderAsset; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."WorkOrderAsset" (
    "workOrderId" text NOT NULL,
    "assetId" text NOT NULL
);


ALTER TABLE public."WorkOrderAsset" OWNER TO ar_master;

--
-- TOC entry 225 (class 1259 OID 22303)
-- Name: WorkOrderNote; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public."WorkOrderNote" (
    id text NOT NULL,
    "workOrderId" text NOT NULL,
    note text NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."WorkOrderNote" OWNER TO ar_master;

--
-- TOC entry 217 (class 1259 OID 22181)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: ar_master
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO ar_master;

--
-- TOC entry 4845 (class 2606 OID 22275)
-- Name: Asset Asset_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_pkey" PRIMARY KEY (id);


--
-- TOC entry 4847 (class 2606 OID 22285)
-- Name: Call Call_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Call"
    ADD CONSTRAINT "Call_pkey" PRIMARY KEY (id);


--
-- TOC entry 4857 (class 2606 OID 22327)
-- Name: MaintenanceAsset MaintenanceAsset_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."MaintenanceAsset"
    ADD CONSTRAINT "MaintenanceAsset_pkey" PRIMARY KEY ("maintenanceId", "assetId");


--
-- TOC entry 4855 (class 2606 OID 22320)
-- Name: MaintenanceSchedule MaintenanceSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."MaintenanceSchedule"
    ADD CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY (id);


--
-- TOC entry 4863 (class 2606 OID 22352)
-- Name: PartVendor PartVendor_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."PartVendor"
    ADD CONSTRAINT "PartVendor_pkey" PRIMARY KEY ("partId", "vendorId");


--
-- TOC entry 4859 (class 2606 OID 22337)
-- Name: Part Part_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Part"
    ADD CONSTRAINT "Part_pkey" PRIMARY KEY (id);


--
-- TOC entry 4839 (class 2606 OID 22258)
-- Name: TenantConfig TenantConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."TenantConfig"
    ADD CONSTRAINT "TenantConfig_pkey" PRIMARY KEY (id);


--
-- TOC entry 4836 (class 2606 OID 22250)
-- Name: Tenants Tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Tenants"
    ADD CONSTRAINT "Tenants_pkey" PRIMARY KEY (id);


--
-- TOC entry 4843 (class 2606 OID 22267)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 4861 (class 2606 OID 22345)
-- Name: Vendor Vendor_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_pkey" PRIMARY KEY (id);


--
-- TOC entry 4851 (class 2606 OID 22302)
-- Name: WorkOrderAsset WorkOrderAsset_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."WorkOrderAsset"
    ADD CONSTRAINT "WorkOrderAsset_pkey" PRIMARY KEY ("workOrderId", "assetId");


--
-- TOC entry 4853 (class 2606 OID 22310)
-- Name: WorkOrderNote WorkOrderNote_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."WorkOrderNote"
    ADD CONSTRAINT "WorkOrderNote_pkey" PRIMARY KEY (id);


--
-- TOC entry 4849 (class 2606 OID 22295)
-- Name: WorkOrder WorkOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."WorkOrder"
    ADD CONSTRAINT "WorkOrder_pkey" PRIMARY KEY (id);


--
-- TOC entry 4833 (class 2606 OID 22189)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4840 (class 1259 OID 22355)
-- Name: TenantConfig_tenantId_key; Type: INDEX; Schema: public; Owner: ar_master
--

CREATE UNIQUE INDEX "TenantConfig_tenantId_key" ON public."TenantConfig" USING btree ("tenantId");


--
-- TOC entry 4834 (class 1259 OID 22354)
-- Name: Tenants_parentId_idx; Type: INDEX; Schema: public; Owner: ar_master
--

CREATE INDEX "Tenants_parentId_idx" ON public."Tenants" USING btree ("parentId");


--
-- TOC entry 4837 (class 1259 OID 22353)
-- Name: Tenants_subdomain_key; Type: INDEX; Schema: public; Owner: ar_master
--

CREATE UNIQUE INDEX "Tenants_subdomain_key" ON public."Tenants" USING btree (subdomain);


--
-- TOC entry 4841 (class 1259 OID 22356)
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: ar_master
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- TOC entry 4867 (class 2606 OID 22372)
-- Name: Asset Asset_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenants"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4868 (class 2606 OID 22377)
-- Name: Call Call_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Call"
    ADD CONSTRAINT "Call_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4869 (class 2606 OID 22382)
-- Name: Call Call_reportedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Call"
    ADD CONSTRAINT "Call_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4870 (class 2606 OID 22387)
-- Name: Call Call_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Call"
    ADD CONSTRAINT "Call_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenants"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4879 (class 2606 OID 22432)
-- Name: MaintenanceAsset MaintenanceAsset_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."MaintenanceAsset"
    ADD CONSTRAINT "MaintenanceAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4880 (class 2606 OID 22437)
-- Name: MaintenanceAsset MaintenanceAsset_maintenanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."MaintenanceAsset"
    ADD CONSTRAINT "MaintenanceAsset_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES public."MaintenanceSchedule"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4877 (class 2606 OID 22422)
-- Name: MaintenanceSchedule MaintenanceSchedule_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."MaintenanceSchedule"
    ADD CONSTRAINT "MaintenanceSchedule_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4878 (class 2606 OID 22427)
-- Name: MaintenanceSchedule MaintenanceSchedule_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."MaintenanceSchedule"
    ADD CONSTRAINT "MaintenanceSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenants"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4883 (class 2606 OID 22452)
-- Name: PartVendor PartVendor_partId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."PartVendor"
    ADD CONSTRAINT "PartVendor_partId_fkey" FOREIGN KEY ("partId") REFERENCES public."Part"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4884 (class 2606 OID 22457)
-- Name: PartVendor PartVendor_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."PartVendor"
    ADD CONSTRAINT "PartVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4881 (class 2606 OID 22442)
-- Name: Part Part_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Part"
    ADD CONSTRAINT "Part_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenants"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4865 (class 2606 OID 22362)
-- Name: TenantConfig TenantConfig_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."TenantConfig"
    ADD CONSTRAINT "TenantConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenants"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4864 (class 2606 OID 22357)
-- Name: Tenants Tenants_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Tenants"
    ADD CONSTRAINT "Tenants_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Tenants"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4866 (class 2606 OID 22367)
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenants"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4882 (class 2606 OID 22447)
-- Name: Vendor Vendor_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."Vendor"
    ADD CONSTRAINT "Vendor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenants"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4873 (class 2606 OID 22402)
-- Name: WorkOrderAsset WorkOrderAsset_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."WorkOrderAsset"
    ADD CONSTRAINT "WorkOrderAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4874 (class 2606 OID 22407)
-- Name: WorkOrderAsset WorkOrderAsset_workOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."WorkOrderAsset"
    ADD CONSTRAINT "WorkOrderAsset_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES public."WorkOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4875 (class 2606 OID 22412)
-- Name: WorkOrderNote WorkOrderNote_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."WorkOrderNote"
    ADD CONSTRAINT "WorkOrderNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4876 (class 2606 OID 22417)
-- Name: WorkOrderNote WorkOrderNote_workOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."WorkOrderNote"
    ADD CONSTRAINT "WorkOrderNote_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES public."WorkOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4871 (class 2606 OID 22392)
-- Name: WorkOrder WorkOrder_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."WorkOrder"
    ADD CONSTRAINT "WorkOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4872 (class 2606 OID 22397)
-- Name: WorkOrder WorkOrder_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: ar_master
--

ALTER TABLE ONLY public."WorkOrder"
    ADD CONSTRAINT "WorkOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenants"(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- Completed on 2025-03-29 15:59:27

--
-- PostgreSQL database dump complete
--

