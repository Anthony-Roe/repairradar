CREATE OR REPLACE FUNCTION public.get_user_metadata(
    p_user_id text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_metadata jsonb;
    v_tenant_config jsonb;
    v_open_calls_count integer;
    v_pending_work_orders_count integer;
    v_assigned_maintenance_count integer;
    v_user_role public."UserRole";
    v_tenant_id text;
BEGIN
    -- Get basic user information and tenant details
    SELECT 
        jsonb_build_object(
            'user', to_jsonb(u.*),
            'tenant', to_jsonb(t.*),
            'parentTenant', CASE WHEN t."parentId" IS NOT NULL THEN 
                (SELECT to_jsonb(pt.*) FROM public."Tenants" pt WHERE pt.id = t."parentId") 
            ELSE NULL END
        ),
        u.role,
        u."tenantId"
    INTO 
        v_user_metadata,
        v_user_role,
        v_tenant_id
    FROM 
        public."User" u
    JOIN 
        public."Tenants" t ON u."tenantId" = t.id
    WHERE 
        u.id = p_user_id;
    
    -- Get tenant configuration
    SELECT modules INTO v_tenant_config
    FROM public."TenantConfig"
    WHERE "tenantId" = v_tenant_id;
    
    -- Add tenant config to metadata
    v_user_metadata := jsonb_set(v_user_metadata, '{tenantConfig}', v_tenant_config);
    
    -- Count open calls (for dashboard stats)
    SELECT COUNT(*) INTO v_open_calls_count
    FROM public."Call"
    WHERE "tenantId" = v_tenant_id AND status = 'OPEN'::public."CallStatus";
    
    -- Count pending work orders
    SELECT COUNT(*) INTO v_pending_work_orders_count
    FROM public."WorkOrder"
    WHERE "tenantId" = v_tenant_id AND status = 'PENDING'::public."WorkOrderStatus";
    
    -- Count assigned maintenance schedules
    SELECT COUNT(*) INTO v_assigned_maintenance_count
    FROM public."MaintenanceSchedule"
    WHERE "tenantId" = v_tenant_id AND "assignedToId" = p_user_id AND status = 'SCHEDULED'::public."MaintenanceStatus";
    
    -- Add counts to metadata
    v_user_metadata := jsonb_set(v_user_metadata, '{counts}', jsonb_build_object(
        'openCalls', v_open_calls_count,
        'pendingWorkOrders', v_pending_work_orders_count,
        'assignedMaintenance', v_assigned_maintenance_count
    ));
    
    -- If user is ADMIN or SUPER_ADMIN, add additional system-wide stats
    IF v_user_role IN ('ADMIN', 'SUPER_ADMIN') THEN
        DECLARE
            v_total_assets integer;
            v_total_users integer;
            v_active_vendors integer;
        BEGIN
            -- Count total assets
            SELECT COUNT(*) INTO v_total_assets
            FROM public."Asset"
            WHERE "tenantId" = v_tenant_id AND "deletedAt" IS NULL;
            
            -- Count total users
            SELECT COUNT(*) INTO v_total_users
            FROM public."User"
            WHERE "tenantId" = v_tenant_id AND "deletedAt" IS NULL;
            
            -- Count active vendors
            SELECT COUNT(*) INTO v_active_vendors
            FROM public."Vendor"
            WHERE "tenantId" = v_tenant_id AND "deletedAt" IS NULL;
            
            -- Add admin stats to metadata
            v_user_metadata := jsonb_set(v_user_metadata, '{adminStats}', jsonb_build_object(
                'totalAssets', v_total_assets,
                'totalUsers', v_total_users,
                'activeVendors', v_active_vendors
            ));
        END;
    END IF;
    
    -- If user has assigned work orders, include basic info about them
    DECLARE
        v_assigned_work_orders jsonb;
    BEGIN
        SELECT jsonb_agg(jsonb_build_object(
            'id', wo.id,
            'description', wo.description,
            'status', wo.status,
            'priority', wo.priority,
            'dueDate', wo."dueDate",
            'assets', (SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name))
        )) INTO v_assigned_work_orders
        FROM public."WorkOrder" wo
        LEFT JOIN public."WorkOrderAsset" woa ON wo.id = woa."workOrderId"
        LEFT JOIN public."Asset" a ON woa."assetId" = a.id
        WHERE wo."assignedToId" = p_user_id AND wo.status <> 'COMPLETED'::public."WorkOrderStatus"
        GROUP BY wo.id;
        
        IF v_assigned_work_orders IS NOT NULL THEN
            v_user_metadata := jsonb_set(v_user_metadata, '{assignedWorkOrders}', v_assigned_work_orders);
        END IF;
    END;
    
    -- If user has assigned maintenance schedules, include basic info about them
    DECLARE
        v_assigned_maintenance jsonb;
    BEGIN
        SELECT jsonb_agg(jsonb_build_object(
            'id', ms.id,
            'description', ms.description,
            'status', ms.status,
            'priority', ms.priority,
            'nextRun', ms."nextRun",
            'assets', (SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name))
        )) INTO v_assigned_maintenance
        FROM public."MaintenanceSchedule" ms
        LEFT JOIN public."MaintenanceAsset" ma ON ms.id = ma."maintenanceId"
        LEFT JOIN public."Asset" a ON ma."assetId" = a.id
        WHERE ms."assignedToId" = p_user_id AND ms.status <> 'COMPLETED'::public."MaintenanceStatus"
        GROUP BY ms.id;
        
        IF v_assigned_maintenance IS NOT NULL THEN
            v_user_metadata := jsonb_set(v_user_metadata, '{assignedMaintenance}', v_assigned_maintenance);
        END IF;
    END;
    
    RETURN v_user_metadata;
END;
$$;