# Project Structure Analysis

*Generated on 2025-04-07 21:27:37*

## 📊 Project Summary

| Category       | Count |
|----------------|-------|
| Files          | 2 |
| Components     | 0 |
| Hooks          | 0 |
| Functions      | 1 |
| Interfaces     | 0 |
| Types          | 1 |
| Classes        | 0 |
| Prisma Models  | 25 |
| Prisma Enums   | 8 |
| Prisma Types   | 0 |
| Generators     | 2 |
| Datasources    | 1 |

## 📂 Directory: prisma

- **.** *(↑ 3 imports)*
  - `schema.prisma`
    - ⚙️ **dbml**  
      ***Config:**
- provider = "prisma-dbml-generator"*  
    - ⚙️ **client**  
      ***Config:**
- provider = "prisma-client-js"*  
    - 🌐 **db**  
      ***Config:**
- provider = "postgresql"
- url      = env("DATABASE_URL")*  
    - 🔠 **AssetStatus**  
      ***Values:** OPERATIONAL | MAINTENANCE | OUT_OF_SERVICE | DECOMMISSIONED*  
    - 🔠 **CallPriority**  
      ***Values:** LOW | MEDIUM | HIGH | CRITICAL*  
    - 🔠 **CallStatus**  
      ***Values:** OPEN | IN_PROGRESS | ON_HOLD | CLOSED*  
    - 🔠 **IndustryType**  
      ***Values:** MANUFACTURING | HEALTHCARE | FACILITY | LABORATORY | ENERGY | TRANSPORTATION | OTHER*  
    - 🔠 **MaintenanceStatus**  
      ***Values:** SCHEDULED | IN_PROGRESS | COMPLETED | OVERDUE | CANCELLED*  
    - 🔠 **MaintenanceTrigger**  
      ***Values:** TIME_BASED | METER_BASED*  
    - 🔠 **UserRole**  
      ***Values:** TECHNICIAN | SUPERVISOR | MANAGER | ADMIN | SUPER_ADMIN*  
    - 🔠 **WorkOrderStatus**  
      ***Values:** PENDING | IN_PROGRESS | ON_HOLD | COMPLETED | CANCELLED*  
    - 🏢 **Tenant**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- name: String
- subdomain: String 💠 Unique
...*  
    - 🏢 **TenantSettings**  
      ***Fields:**
- tenant: Tenant
- tenantId: String 🔑 Primary Key 🗃️ DB Type: Uuid
- config: Json

**Rel...*  
    - 🏢 **User**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- name: String
- email: String 💠 Unique
- em...*  
    - 🏢 **Account**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- userId: String 🗃️ DB Type: Uuid
- user: Us...*  
    - 🏢 **Session**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- sessionToken: String 💠 Unique 🗃️ DB Type: ...*  
    - 🏢 **AssetCategory**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- tenant: Tenant
- tenantId: String 🗃️ DB Ty...*  
    - 🏢 **VerificationToken**  
      ***Fields:**
- identifier: String 🗃️ DB Type: VarChar
- token: String 💠 Unique 🗃️ DB Type: VarChar
- ...*  
    - 🏢 **AssetType**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- tenant: Tenant
- tenantId: String 🗃️ DB Ty...*  
    - 🏢 **Asset**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- tenant: Tenant
- tenantId: String 🗃️ DB Ty...*  
    - 🏢 **Meter**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- tenant: Tenant
- tenantId: String 🗃️ DB Ty...*  
    - 🏢 **AssetMeter**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- asset: Asset
- assetId: String 🗃️ DB Type:...*  
    - 🏢 **MeterReading**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- assetMeter: AssetMeter
- assetMeterId: Str...*  
    - 🏢 **MaintenanceSchedule**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- tenant: Tenant
- tenantId: String 🗃️ DB Ty...*  
    - 🏢 **MaintenanceAssignment**  
      ***Fields:**
- maintenance: MaintenanceSchedule
- maintenanceId: String 🗃️ DB Type: Uuid
- user: User...*  
    - 🏢 **MaintenanceAssets**  
      ***Fields:**
- maintenance: MaintenanceSchedule
- maintenanceId: String 🗃️ DB Type: Uuid
- asset: Ass...*  
    - 🏢 **WorkOrder**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- tenant: Tenant
- tenantId: String 🗃️ DB Ty...*  
    - 🏢 **WorkOrderAssignment**  
      ***Fields:**
- workOrder: WorkOrder
- workOrderId: String 🗃️ DB Type: Uuid
- user: User
- userId: Str...*  
    - 🏢 **WorkOrderAssets**  
      ***Fields:**
- workOrder: WorkOrder
- workOrderId: String 🗃️ DB Type: Uuid
- asset: Asset
- assetId: ...*  
    - 🏢 **Part**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- tenant: Tenant
- tenantId: String 🗃️ DB Ty...*  
    - 🏢 **WorkOrderParts**  
      ***Fields:**
- workOrder: WorkOrder
- workOrderId: String 🗃️ DB Type: Uuid
- part: Part
- partId: Str...*  
    - 🏢 **Vendor**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- tenant: Tenant
- tenantId: String 🗃️ DB Ty...*  
    - 🏢 **PartVendor**  
      ***Fields:**
- part: Part
- partId: String 🗃️ DB Type: Uuid
- vendor: Vendor
- vendorId: String 🗃️ DB...*  
    - 🏢 **WorkOrderLabor**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- workOrder: WorkOrder
- workOrderId: String...*  
    - 🏢 **Incident**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- tenant: Tenant
- tenantId: String 🗃️ DB Ty...*  
    - 🏢 **WorkOrderLog**  
      ***Fields:**
- id: String 🔑 Primary Key 🗃️ DB Type: Uuid
- workOrder: WorkOrder
- workOrderId: String...*  
  - `seed.ts`
    - 📌 **SeedData**  
      * Tenant:  name: string*  
    - 🔹 **seed**  
- **dbml**
