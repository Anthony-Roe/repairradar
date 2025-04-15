
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  subdomain: 'subdomain',
  parentId: 'parentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.TenantSettingsScalarFieldEnum = {
  tenantId: 'tenantId',
  config: 'config',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  emailVerified: 'emailVerified',
  image: 'image',
  tenantId: 'tenantId',
  employeeId: 'employeeId',
  password: 'password',
  role: 'role',
  firstName: 'firstName',
  lastName: 'lastName',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetCategoryScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  industry: 'industry',
  description: 'description',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetTypeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  categoryId: 'categoryId',
  name: 'name',
  description: 'description',
  expectedLifespan: 'expectedLifespan',
  maintenanceFrequency: 'maintenanceFrequency',
  criticality: 'criticality',
  customFields: 'customFields',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetTypeId: 'assetTypeId',
  name: 'name',
  location: 'location',
  status: 'status',
  serialNumber: 'serialNumber',
  purchaseDate: 'purchaseDate',
  lastMaintenanceDate: 'lastMaintenanceDate',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.MeterScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  unit: 'unit',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetMeterScalarFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  meterId: 'meterId',
  initialReading: 'initialReading',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MeterReadingScalarFieldEnum = {
  id: 'id',
  assetMeterId: 'assetMeterId',
  readingValue: 'readingValue',
  readingDate: 'readingDate',
  createdAt: 'createdAt'
};

exports.Prisma.MaintenanceScheduleScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  description: 'description',
  triggerType: 'triggerType',
  recurrence: 'recurrence',
  meterId: 'meterId',
  thresholdValue: 'thresholdValue',
  nextRun: 'nextRun',
  lastRun: 'lastRun',
  status: 'status',
  priority: 'priority',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.MaintenanceAssignmentScalarFieldEnum = {
  maintenanceId: 'maintenanceId',
  userId: 'userId'
};

exports.Prisma.MaintenanceAssetsScalarFieldEnum = {
  maintenanceId: 'maintenanceId',
  assetId: 'assetId'
};

exports.Prisma.WorkOrderScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  maintenanceId: 'maintenanceId',
  description: 'description',
  status: 'status',
  priority: 'priority',
  dueDate: 'dueDate',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WorkOrderAssignmentScalarFieldEnum = {
  workOrderId: 'workOrderId',
  userId: 'userId'
};

exports.Prisma.WorkOrderAssetsScalarFieldEnum = {
  workOrderId: 'workOrderId',
  assetId: 'assetId'
};

exports.Prisma.WorkOrderPartsScalarFieldEnum = {
  workOrderId: 'workOrderId',
  partId: 'partId',
  quantityUsed: 'quantityUsed'
};

exports.Prisma.PartScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  partNumber: 'partNumber',
  description: 'description',
  quantity: 'quantity',
  minStock: 'minStock',
  unitCost: 'unitCost',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.VendorScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  contactInfo: 'contactInfo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.PartVendorScalarFieldEnum = {
  partId: 'partId',
  vendorId: 'vendorId',
  cost: 'cost',
  leadTime: 'leadTime'
};

exports.Prisma.WorkOrderLaborScalarFieldEnum = {
  id: 'id',
  workOrderId: 'workOrderId',
  userId: 'userId',
  hours: 'hours',
  taskDescription: 'taskDescription',
  createdAt: 'createdAt'
};

exports.Prisma.IncidentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  assetId: 'assetId',
  reportedById: 'reportedById',
  description: 'description',
  status: 'status',
  priority: 'priority',
  reportedAt: 'reportedAt',
  resolvedAt: 'resolvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WorkOrderLogScalarFieldEnum = {
  id: 'id',
  workOrderId: 'workOrderId',
  userId: 'userId',
  action: 'action',
  details: 'details',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  TECHNICIAN: 'TECHNICIAN',
  SUPERVISOR: 'SUPERVISOR',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
};

exports.IndustryType = exports.$Enums.IndustryType = {
  MANUFACTURING: 'MANUFACTURING',
  HEALTHCARE: 'HEALTHCARE',
  FACILITY: 'FACILITY',
  LABORATORY: 'LABORATORY',
  ENERGY: 'ENERGY',
  TRANSPORTATION: 'TRANSPORTATION',
  OTHER: 'OTHER'
};

exports.AssetStatus = exports.$Enums.AssetStatus = {
  OPERATIONAL: 'OPERATIONAL',
  MAINTENANCE: 'MAINTENANCE',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE',
  DECOMMISSIONED: 'DECOMMISSIONED'
};

exports.MaintenanceTrigger = exports.$Enums.MaintenanceTrigger = {
  TIME_BASED: 'TIME_BASED',
  METER_BASED: 'METER_BASED'
};

exports.MaintenanceStatus = exports.$Enums.MaintenanceStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED'
};

exports.CallPriority = exports.$Enums.CallPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.WorkOrderStatus = exports.$Enums.WorkOrderStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.CallStatus = exports.$Enums.CallStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  CLOSED: 'CLOSED'
};

exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  TenantSettings: 'TenantSettings',
  User: 'User',
  Account: 'Account',
  Session: 'Session',
  AssetCategory: 'AssetCategory',
  VerificationToken: 'VerificationToken',
  AssetType: 'AssetType',
  Asset: 'Asset',
  Meter: 'Meter',
  AssetMeter: 'AssetMeter',
  MeterReading: 'MeterReading',
  MaintenanceSchedule: 'MaintenanceSchedule',
  MaintenanceAssignment: 'MaintenanceAssignment',
  MaintenanceAssets: 'MaintenanceAssets',
  WorkOrder: 'WorkOrder',
  WorkOrderAssignment: 'WorkOrderAssignment',
  WorkOrderAssets: 'WorkOrderAssets',
  WorkOrderParts: 'WorkOrderParts',
  Part: 'Part',
  Vendor: 'Vendor',
  PartVendor: 'PartVendor',
  WorkOrderLabor: 'WorkOrderLabor',
  Incident: 'Incident',
  WorkOrderLog: 'WorkOrderLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
