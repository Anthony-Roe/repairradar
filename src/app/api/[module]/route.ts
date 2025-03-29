import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { ModuleConfig } from '@/shared/modules/types';

const moduleConfig: Record<string, ModuleConfig> = {
  assets: {
    table: 'assets',
    metrics: (items) => ({
      total: items.length,
      active: items.filter((item) => !item.deleted_at).length,
    }),
    orderBy: { column: 'name', direction: 'asc' },
    createTransform: (data) => ({
      name: data.name,
      location: data.location || null,
      tenant_id: data.tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  },
  calls: {
    table: 'calls',
    metrics: (items) => ({
      total: items.length,
      open: items.filter((item) => item.status === "OPEN").length,
    }),
    relations: ['assets(*)', 'users!reported_by_id(id,email)'],
    orderBy: { column: 'call_time', direction: 'desc' },
    createTransform: (data, session) => ({
      issue: data.issue,
      status: 'OPEN',
      tenant_id: data.tenantId,
      asset_id: data.assetId,
      reported_by_id: session.user.id,
      call_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  },
  "work-orders": {
    table: 'work_orders',
    metrics: (items) => ({
      total: items.length,
      active: items.filter((item) => item.status === "IN_PROGRESS" || item.status === "PENDING").length,
    }),
    relations: ['work_order_assets(asset_id,asset:assets(*))', 'work_order_notes(*)', 'users!assigned_to_id(id,email)'],
    orderBy: { column: 'created_at', direction: 'desc' },
    createTransform: (data) => ({
      description: data.description,
      status: 'PENDING',
      tenant_id: data.tenantId,
      priority: data.priority || 'MEDIUM',
      due_date: data.dueDate || null,
      assigned_to_id: data.assignedToId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  },
  "preventative-maintenance": {
    table: 'maintenance_schedules',
    metrics: (items) => ({
      total: items.length,
      scheduled: items.filter((item) => item.status === "SCHEDULED").length,
      overdue: items.filter((item) => item.status === "OVERDUE").length,
    }),
    relations: ['maintenance_schedule_assets(asset_id,asset:assets(*))', 'users!assigned_to_id(id,email)'],
    orderBy: { column: 'next_run', direction: 'asc' },
    createTransform: (data) => ({
      description: data.description,
      recurrence: data.recurrence,
      next_run: data.nextRun,
      last_run: data.lastRun || null,
      status: data.status || 'SCHEDULED',
      priority: data.priority || 'MEDIUM',
      assigned_to_id: data.assignedToId || null,
      tenant_id: data.tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  },
};

export async function GET(request: NextRequest, { params }: { params: { module: string } }) {
  // Authentication check
  const { data: { session }, error: err } = await supabase.auth.getSession();
  if (err || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user;

  const { module } = params;
  const config = moduleConfig[module];
  if (!config) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const tenant = searchParams.get('subdomain') || user.user_metadata?.tenantId;

  // Define query with a simpler type or let inference handle it
  let query = config.relations 
    ? supabase.from(config.table).select(`*, ${config.relations.join(',')}`)
    : supabase.from(config.table).select('*');
  
  query = query.eq('tenant_id', tenant);
  
  if (id) {
    query = query.eq('id', id).single();
  } else if (config.orderBy) {
    query = query.order(config.orderBy.column, { ascending: config.orderBy.direction === 'asc' });
  }

  const { data, error } = await query;
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (id && !data) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  const metrics = config.metrics && !id ? config.metrics(data || []) : undefined;
  
  return NextResponse.json({ data: id ? data : data, metrics });
}

export async function POST(request: NextRequest, { params }: { params: { module: string } }) {
  // Authentication check
  const { data: { session }, error: err } = await supabase.auth.getSession();
  if (err || !session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user;

  const { module } = params;
  const config = moduleConfig[module];
  if (!config) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const action = request.headers.get('X-Action');
  
  const body = await request.json();
  const tenant = body.subdomain || user.user_metadata?.tenantId;

  if (action === 'delete' && id) {
    const { error } = await supabase
      .from(config.table)
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenant);
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (id) {
    // Update operation
    const updateData = { ...body, updated_at: new Date().toISOString() };
    delete updateData.assetIds;
    delete updateData.newNotes;

    const { error: updateError } = await supabase
      .from(config.table)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenant);
      
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    
    if (module === 'work-orders') {
      if (body.assetIds) {
        await supabase.from('work_order_assets').delete().eq('work_order_id', id);
        const assetRecords = body.assetIds.map((assetId: string) => ({
          work_order_id: id,
          asset_id: assetId
        }));
        const { error: assetError } = await supabase.from('work_order_assets').insert(assetRecords);
        if (assetError) return NextResponse.json({ error: assetError.message }, { status: 500 });
      }
      
      if (body.newNotes?.length > 0) {
        const noteRecords = body.newNotes.map((note: string) => ({
          work_order_id: id,
          note,
          created_by_id: user.id,
          created_at: new Date().toISOString()
        }));
        const { error: noteError } = await supabase.from('work_order_notes').insert(noteRecords);
        if (noteError) return NextResponse.json({ error: noteError.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
  } else {
    // Create operation
    const transformedData = config.createTransform 
      ? config.createTransform(body, { user }) // Pass user instead of full session
      : { ...body, tenant_id: tenant };
    
    const { data, error } = await supabase
      .from(config.table)
      .insert(transformedData)
      .select()
      .single();
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
    
    if (module === 'work-orders' && body.assetIds) {
      const assetRecords = body.assetIds.map((assetId: string) => ({
        work_order_id: data.id,
        asset_id: assetId
      }));
      const { error: assetError } = await supabase.from('work_order_assets').insert(assetRecords);
      if (assetError) return NextResponse.json({ error: assetError.message }, { status: 500 });
    }
    
    if (module === 'preventative-maintenance' && body.assetIds) {
      const assetRecords = body.assetIds.map((assetId: string) => ({
        maintenance_schedule_id: data.id,
        asset_id: assetId
      }));
      const { error: assetError } = await supabase.from('maintenance_schedule_assets').insert(assetRecords);
      if (assetError) return NextResponse.json({ error: assetError.message }, { status: 500 });
    }
    
    if (module === 'work-orders' && body.notes?.length > 0) {
      const noteRecords = body.notes.map((note: string) => ({
        work_order_id: data.id,
        note,
        created_by_id: user.id,
        created_at: new Date().toISOString()
      }));
      const { error: noteError } = await supabase.from('work_order_notes').insert(noteRecords);
      if (noteError) return NextResponse.json({ error: noteError.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  }
}