// actions.ts for dashboard
"use server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getUser() {
  const supabase = await createClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select(`id, name, subdomain, tenant_configs (modules), deleted_at`)
    .is("deleted_at", null); // Filter out deleted tenants
  return tenants;
}

export async function fetchDashboardData() {
  const supabase = await createClient();

  // Fetch assets
  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, location, updated_at")
    .is("deleted_at", null);

  // Fetch live maintenance calls
  const { data: calls } = await supabase
    .from("calls")
    .select("id, asset_id, issue, call_time, status, updated_at")
    .is("deleted_at", null)
    .in("status", ["open", "in_progress"]); // Active calls only

  // Fetch work orders
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, description, status, priority, assigned_to_id, due_date")
    .is("deleted_at", null);

  // Fetch parts inventory
  const { data: parts } = await supabase
    .from("parts")
    .select("id, name, quantity, min_stock")
    .is("deleted_at", null);

  // Fetch vendors (simplified join with part_vendors)
  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, part_vendors (cost)")
    .is("deleted_at", null);

  return { assets, calls, workOrders, parts, vendors };
}

export async function endCall(callId: string, solution: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calls")
    .update({ status: "closed", end_time: new Date().toISOString(), solution })
    .eq("id", callId);
  if (!error) {
    revalidatePath("/dashboard");
  }
  return { error };
}