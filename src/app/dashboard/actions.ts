// app/dashboard/actions.ts
"use server";
import { db } from "@/lib/helper";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function fetchDashboardData() {
  const database = await db();
  const user = await database.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  // Fetch all dashboard data in parallel
  const [
    assetsPromise,
    callsPromise,
    workOrdersPromise,
    partsPromise,
    vendorsPromise
  ] = await Promise.all([
    database.assets.getAll(user.tenantId),
    database.calls.getAll(user.tenantId, { status: CallStatus.OPEN }),
    database.workOrders.getAll(user.tenantId),
    database.parts.getAll(user.tenantId),
    database.from("vendors").select("id, name, part_vendors (cost, part_id)").is("deleted_at", null)
  ]);

  // Process results
  const { data: assets } = assetsPromise;
  const { data: calls } = callsPromise;
  const { data: workOrders } = workOrdersPromise;
  const { data: parts } = partsPromise;
  const { data: vendors } = vendorsPromise;

  return { 
    assets: assets || [], 
    calls: calls || [], 
    workOrders: workOrders || [], 
    parts: parts || [], 
    vendors: vendors || [] 
  };
}

export async function endCall(callId: string, solution: string) {
  const database = await db();
  
  const { error } = await database.calls.updateStatus(
    callId, 
    CallStatus.CLOSED,
    undefined, // Optional tenantId if needed
    { solution }
  );

  if (error) {
    console.error("Error ending call:", error);
    return { error };
  }

  revalidatePath("/dashboard");
  return { error: null };
}

export async function createWorkOrder(assetId: string, description: string) {
  const database = await db();
  const user = await database.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const { data, error } = await database.workOrders.create({
    tenantId: user.tenantId,
    assetId,
    description,
    priority: WorkOrderPriority.MEDIUM,
    assignedToId: null,
    dueDate: null
  });

  if (error) {
    console.error("Error creating work order:", error);
    return { error };
  }

  revalidatePath("/dashboard");
  return { data, error: null };
}

export async function updatePartQuantity(partId: string, newQuantity: number) {
  const database = await db();
  
  const { error } = await database.parts.update(partId, {
    quantity: newQuantity,
    updatedAt: new Date()
  });

  if (error) {
    console.error("Error updating part quantity:", error);
    return { error };
  }

  revalidatePath("/dashboard");
  return { error: null };
}

export async function assignWorkOrder(workOrderId: string, userId: string) {
  const database = await db();
  
  const { error } = await database.workOrders.assign(workOrderId, userId);

  if (error) {
    console.error("Error assigning work order:", error);
    return { error };
  }

  revalidatePath("/dashboard");
  return { error: null };
}

export async function addWorkOrderNote(workOrderId: string, note: string) {
  const database = await db();
  const user = await database.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const { error } = await database.workOrders.addNote(
    workOrderId, 
    note, 
    user.id
  );

  if (error) {
    console.error("Error adding work order note:", error);
    return { error };
  }

  revalidatePath("/dashboard");
  return { error: null };
}