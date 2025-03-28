// /workspaces/repairradar/scripts/wipeAndSeed.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and Service Role Key must be provided in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function wipeAndSeedData() {
  try {
    // Step 1: Wipe all data from tables (in reverse dependency order to avoid foreign key constraints)
    console.log('Wiping all data from tables...');

    await supabase.from('part_vendors').delete().neq('part_id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    await supabase.from('maintenance_assets').delete().neq('maintenance_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('work_order_assets').delete().neq('work_order_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('work_order_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('parts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('maintenance_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('work_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('calls').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tenant_configs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tenants').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('All tables wiped successfully.');

    // Step 2: Wipe all users from Supabase Auth
    console.log('Wiping all users from Supabase Auth...');
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    for (const user of authUsers.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
    }
    console.log('All auth users deleted.');

    // Step 3: Seed tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: 'RepairRadar', subdomain: 'repairradar' })
      .select()
      .single();
    if (tenantError) throw tenantError;
    console.log('Tenant seeded:', tenant);

    // Step 4: Seed super admin via Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@repairradar.com',
      password: 'password', // Change this as needed
      email_confirm: true, // Automatically confirm email
    });
    if (authError) throw authError;

    // Step 5: Sync super admin with users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        tenant_id: tenant!.id,
        email: 'admin@repairradar.com',
        password: 'password', // Replace with actual hashed password if your app validates it
        role: 'SUPER_ADMIN',
      })
      .select()
      .single();
    if (userError) throw userError;
    console.log('Super admin seeded:', user);

  } catch (error) {
    console.error('Wipe and seed failed:', error instanceof Error ? error.message : error);
  }
}

wipeAndSeedData();