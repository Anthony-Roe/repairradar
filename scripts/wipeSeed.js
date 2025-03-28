"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// /workspaces/repairradar/scripts/wipeAndSeed.ts
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv = require("dotenv");
dotenv.config();
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL and Service Role Key must be provided in environment variables');
}
var supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
function wipeAndSeedData() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, authUsers, listError, _i, _b, user_1, deleteError, _c, tenant, tenantError, _d, authUser, authError, _e, user, userError, error_1;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 22, , 23]);
                    // Step 1: Wipe all data from tables (in reverse dependency order to avoid foreign key constraints)
                    console.log('Wiping all data from tables...');
                    return [4 /*yield*/, supabase.from('part_vendors').delete().neq('part_id', '00000000-0000-0000-0000-000000000000')];
                case 1:
                    _f.sent(); // Delete all rows
                    return [4 /*yield*/, supabase.from('maintenance_assets').delete().neq('maintenance_id', '00000000-0000-0000-0000-000000000000')];
                case 2:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('work_order_assets').delete().neq('work_order_id', '00000000-0000-0000-0000-000000000000')];
                case 3:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('work_order_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 4:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 5:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('parts').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 6:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('maintenance_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 7:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('work_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 8:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('calls').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 9:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 10:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 11:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('tenant_configs').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 12:
                    _f.sent();
                    return [4 /*yield*/, supabase.from('tenants').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 13:
                    _f.sent();
                    console.log('All tables wiped successfully.');
                    // Step 2: Wipe all users from Supabase Auth
                    console.log('Wiping all users from Supabase Auth...');
                    return [4 /*yield*/, supabase.auth.admin.listUsers()];
                case 14:
                    _a = _f.sent(), authUsers = _a.data, listError = _a.error;
                    if (listError)
                        throw listError;
                    _i = 0, _b = authUsers.users;
                    _f.label = 15;
                case 15:
                    if (!(_i < _b.length)) return [3 /*break*/, 18];
                    user_1 = _b[_i];
                    return [4 /*yield*/, supabase.auth.admin.deleteUser(user_1.id)];
                case 16:
                    deleteError = (_f.sent()).error;
                    if (deleteError)
                        throw deleteError;
                    _f.label = 17;
                case 17:
                    _i++;
                    return [3 /*break*/, 15];
                case 18:
                    console.log('All auth users deleted.');
                    return [4 /*yield*/, supabase
                            .from('tenants')
                            .insert({ name: 'RepairRadar', subdomain: 'repairradar' })
                            .select()
                            .single()];
                case 19:
                    _c = _f.sent(), tenant = _c.data, tenantError = _c.error;
                    if (tenantError)
                        throw tenantError;
                    console.log('Tenant seeded:', tenant);
                    return [4 /*yield*/, supabase.auth.admin.createUser({
                            email: 'admin@repairradar.com',
                            password: 'password', // Change this as needed
                            email_confirm: true, // Automatically confirm email
                        })];
                case 20:
                    _d = _f.sent(), authUser = _d.data, authError = _d.error;
                    if (authError)
                        throw authError;
                    return [4 /*yield*/, supabase
                            .from('users')
                            .insert({
                            id: authUser.user.id,
                            tenant_id: tenant.id,
                            email: 'admin@repairradar.com',
                            password: 'password', // Replace with actual hashed password if your app validates it
                            role: 'SUPER_ADMIN',
                        })
                            .select()
                            .single()];
                case 21:
                    _e = _f.sent(), user = _e.data, userError = _e.error;
                    if (userError)
                        throw userError;
                    console.log('Super admin seeded:', user);
                    return [3 /*break*/, 23];
                case 22:
                    error_1 = _f.sent();
                    console.error('Wipe and seed failed:', error_1 instanceof Error ? error_1.message : error_1);
                    return [3 /*break*/, 23];
                case 23: return [2 /*return*/];
            }
        });
    });
}
wipeAndSeedData();
