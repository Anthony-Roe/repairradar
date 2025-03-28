import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { createClient } from '@/lib/supabase-server';
const supabase = createClient();
export const dynamic = "force-dynamic";

const moduleConfig: Record<
  string,
  {
    table: string;
    metrics?: (items: any[]) => Record<string, number>;
    relations?: string[];
    orderBy?: { column: string; direction: 'asc' | 'desc' };
    createTransform?: (data: any, session: any) => any;
  }
> = {
  assets: {
    table: 'assets',
    metrics: (items) => ({
      total: items.length,
      active: items.filter((item) => !item.deleted_at).length,
    }),
    orderBy: { column: 'name', direction: 'asc' },
    createTransform: (data, session) => ({
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
    createTransform: (data, session) => ({
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
    createTransform: (data, session) => ({
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { module } = params;
  const config = moduleConfig[module];
  if (!config) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const tenant = searchParams.get('subdomain') || session.user.tenantId;

  let query = supabase.from(config.table).select('*');
  
  // Add relations if specified
  if (config.relations) {
    query = supabase.from(config.table).select(`*, ${config.relations.join(',')}`);
  }
  
  // Filter by tenant
  query = query.eq('tenant_id', tenant);
  
  // Filter by ID if provided
  if (id) {
    query = query.eq('id', id);
  } else if (config.orderBy) {
    query = query.order(config.orderBy.column, { ascending: config.orderBy.direction === 'asc' });
  }

  const { data, error } = await query;
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  const metrics = config.metrics ? config.metrics(data || []) : undefined;
  
  return NextResponse.json({ data: id ? data[0] : data, metrics });
}

export async function POST(request: NextRequest, { params }: { params: { module: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { module } = params;
  const config = moduleConfig[module];
  if (!config) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const action = request.headers.get('X-Action');
  
  const body = await request.json();
  const tenant = body.subdomain || session.user.tenantId;

  // Handle different actions
  if (action === 'delete' && id) {
    const { error } = await supabase
      .from(config.table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenant);
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (id) {
    // Update operation
    const { error } = await supabase
      .from(config.table)
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenant);
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // Handle special cases for related records
    if (module === 'work-orders' && body.assetIds) {
      // First delete existing relations
      await supabase
        .from('work_order_assets')
        .delete()
        .eq('work_order_id', id);
        
      // Then insert new ones
      const assetRecords = body.assetIds.map((assetId: string) => ({
        work_order_id: id,
        asset_id: assetId
      }));
      
      await supabase.from('work_order_assets').insert(assetRecords);
    }
    
    if (module === 'work-orders' && body.newNotes && body.newNotes.length > 0) {
      const noteRecords = body.newNotes.map((note: string) => ({
        work_order_id: id,
        note,
        created_by_id: session.user.id,
        created_at: new Date().toISOString()
      }));
      
      await supabase.from('work_order_notes').insert(noteRecords);
    }
    
    return NextResponse.json({ success: true });
  } else {
    // Create operation
    const transformedData = config.createTransform 
      ? config.createTransform(body, session)
      : body;
      
    const { data, error } = await supabase
      .from(config.table)
      .insert(transformedData)
      .select();
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    
    // Handle related records for creation
    if (module === 'work-orders' && body.assetIds && data[0].id) {
      const assetRecords = body.assetIds.map((assetId: string) => ({
        work_order_id: data[0].id,
        asset_id: assetId
      }));
      
      await supabase.from('work_order_assets').insert(assetRecords);
    }
    
    if (module === 'preventative-maintenance' && body.assetIds && data[0].id) {
      const assetRecords = body.assetIds.map((assetId: string) => ({
        maintenance_schedule_id: data[0].id,
        asset_id: assetId
      }));
      
      await supabase.from('maintenance_schedule_assets').insert(assetRecords);
    }
    
    if (module === 'work-orders' && body.notes && body.notes.length > 0 && data[0].id) {
      const noteRecords = body.notes.map((note: string) => ({
        work_order_id: data[0].id,
        note,
        created_by_id: session.user.id,
        created_at: new Date().toISOString()
      }));
      
      await supabase.from('work_order_notes').insert(noteRecords);
    }
    
    return NextResponse.json({ data: data[0] });
  }
}
