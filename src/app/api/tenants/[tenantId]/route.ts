// src/app/api/tenants/[tenantId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase"; // Assuming this is your Supabase client setup
import { TenantConfig } from "@/shared/modules/types";

// Define TypeScript interface for consistency with previous code

export async function GET(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const { data: { session }, error: err } = await supabase.auth.getSession();
  if (err || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user;

  const { tenantId } = await context.params;
  const { searchParams } = new URL(req.url);
  const subdomain = searchParams.get("subdomain");

  const query = supabase
    .from('tenants')
    .select(`
      id,
      name,
      subdomain,
      deleted_at,
      tenant_configs (
        modules
      )
    `);

  if (subdomain) {
    query.eq('subdomain', subdomain);
  } else {
    query.eq('id', tenantId);
    // Only filter deleted_at for non-super admins
    if (user.role !== "SUPER_ADMIN") {
      query.is('deleted_at', null);
    }
  }

  const { data: tenant, error } = await query.single();

  console.log("tenant", tenant);

  if (error || !tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // Format response to match TenantConfig structure
  const formattedTenant: TenantConfig = {
    tenantId: tenant.id,
    subdomain: tenant.subdomain,
    modules: tenant.tenant_configs ? { modules: tenant.tenant_configs.modules } : {},
    deletedAt: tenant.deleted_at
  };

  return NextResponse.json(formattedTenant);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const { data: { session }, error: err } = await supabase.auth.getSession();
  if (err || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user;
  if (user && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = req.headers.get("X-Action");
  const body = await req.json();
  const { tenantId } = await context.params;

  if (action === "updateTenant") {
    const { modules } = body;

    // Update or insert tenant_configs (upsert equivalent)
    const { error: configError } = await supabase
      .from('tenant_configs')
      .upsert({
        tenant_id: tenantId,
        modules,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id'
      })
      .select(`
        modules
      `)
      .single();

    if (configError) return NextResponse.json({ error: configError.message }, { status: 500 });

    // Fetch the updated tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        subdomain,
        deleted_at,
        tenant_configs (
          modules
        )
      `)
      .eq('id', tenantId)
      .single();

    if (tenantError) return NextResponse.json({ error: tenantError.message }, { status: 500 });

    const formattedTenant: TenantConfig = {
      tenantId: tenant.id,
      subdomain: tenant.subdomain,
      modules: tenant.tenant_configs ? { modules: tenant.tenant_configs.modules } : {},
      deletedAt: tenant.deleted_at
    };

    return NextResponse.json(formattedTenant);
  } else if (action === "softDeleteTenant") {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: `Tenant soft deleted ${tenant.id}` });
  }

  return NextResponse.json({ error: `Invalid action ${action}` }, { status: 400 });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ tenantId: string }> }) {
  const { data: { session }, error: err } = await supabase.auth.getSession();
  if (err || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user;
  if (user && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = await context.params;

  // Note: Due to ON DELETE CASCADE in tenant_configs, this will also delete the related config
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "Tenant deleted" });
}