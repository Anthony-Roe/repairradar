// src/app/api/tenants/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TenantConfig } from "@/shared/modules/types";

export async function GET(request: NextRequest) {
  const { data: { session }, error: err } = await supabase.auth.getSession();
  if (err || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user;
  console.log("SESSION:", session);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const subdomain = searchParams.get("subdomain");

  if (subdomain) {
    const { data: tenant, error } = await supabase
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
      .eq('subdomain', subdomain)
      .is('deleted_at', null)
      .single();

    if (error || !tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    // Format single tenant response
    const formattedTenant: TenantConfig = {
      tenantId: tenant.id,
      subdomain: tenant.subdomain,
      modules: tenant.tenant_configs ? { modules: tenant.tenant_configs.modules } : {},
      deletedAt: tenant.deleted_at
    };
    
    return NextResponse.json({ config: formattedTenant });
  }

  if (user && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: tenants, error } = await supabase
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
    .is('deleted_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Format the response to match the provided structure
  const formattedTenants = tenants.map((tenant) => ({
    tenantId: tenant.id,
    subdomain: tenant.subdomain,
    modules: tenant.tenant_configs ? { modules: tenant.tenant_configs.modules } : {},
    deletedAt: tenant.deleted_at
  } as TenantConfig));

  return NextResponse.json({ tenants: formattedTenants });
}

export async function POST(req: NextRequest) {
  const { data: { session }, error: err } = await supabase.auth.getSession();
  if (err || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user;
  if (!user || user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { name, subdomain, modules } = await req.json();

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name, subdomain })
    .select(`
      id,
      name,
      subdomain,
      deleted_at
    `)
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: tenantError?.message || "Failed to create tenant" }, { status: 500 });
  }

  const { data: config, error: configError } = await supabase
    .from('tenant_configs')
    .insert({
      tenant_id: tenant.id,
      modules
    })
    .select('modules')
    .single();

  if (configError) {
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  // Format response following the structure
  const formattedTenant: TenantConfig = {
    tenantId: tenant.id,
    subdomain: tenant.subdomain,
    modules: config ? { modules: config.modules } : {},
    deletedAt: tenant.deleted_at
  };

  return NextResponse.json(formattedTenant, { status: 201 });
}