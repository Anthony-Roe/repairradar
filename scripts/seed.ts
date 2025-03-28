// /workspaces/repairradar/scripts/seed.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and Service Role Key must be provided in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedData() {
  try {
    // Seed tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: 'Acme Corp', subdomain: 'acme' })
      .select()
      .single();
    if (tenantError) throw tenantError;
    console.log('Tenant seeded:', tenant);

    // Seed user via Supabase Auth
    let authUser;
    const { data: existingUser, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@admin.com',
      password: 'password123',
    });
    if (signInError && signInError.message.includes('Invalid login credentials')) {
      const { data: newUser, error: signUpError } = await supabase.auth.signUp({
        email: 'admin@admin.com',
        password: 'password123',
      });
      if (signUpError) throw signUpError;
      authUser = newUser;
    } else if (signInError) {
      throw signInError;
    } else {
      authUser = existingUser;
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user!.id,
        tenant_id: tenant!.id,
        email: 'admin@acme.com',
        password: 'hashed_password_here', // Replace with actual hashing if needed
        role: 'SUPER_ADMIN',
      })
      .select()
      .single();
    if (userError) throw userError;
    console.log('User seeded:', user);

    // Seed parts
    const parts = [
      { name: 'Screw', description: 'Small metal screw', quantity: 100, min_stock: 20, tenant_id: tenant!.id },
      { name: 'Bolt', description: 'Large steel bolt', quantity: 50, min_stock: 10, tenant_id: tenant!.id },
    ];
    const { data: partsData, error: partsError } = await supabase
      .from('parts')
      .insert(parts)
      .select();
    if (partsError) throw partsError;
    console.log('Parts seeded:', partsData);

    // Seed vendors
    const vendors = [
      { name: 'Vendor A', contact: '123-456-7890', email: 'contact@vendora.com', tenant_id: tenant!.id },
      { name: 'Vendor B', contact: '098-765-4321', email: 'contact@vendorb.com', tenant_id: tenant!.id },
    ];
    const { data: vendorsData, error: vendorsError } = await supabase
      .from('vendors')
      .insert(vendors)
      .select();
    if (vendorsError) throw vendorsError;
    console.log('Vendors seeded:', vendorsData);

    // Seed part-vendor relationships
    const partVendors = [
      { part_id: partsData![0].id, vendor_id: vendorsData![0].id, cost: 0.50 },
      { part_id: partsData![1].id, vendor_id: vendorsData![1].id, cost: 1.25 },
    ];
    const { error: pvError } = await supabase
      .from('part_vendors')
      .insert(partVendors);
    if (pvError) throw pvError;
    console.log('Part-Vendor relationships seeded');

  } catch (error) {
    console.error('Seeding failed:', error instanceof Error ? error.message : error);
  }
}

seedData();