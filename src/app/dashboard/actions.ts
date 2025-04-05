// app/dashboard/actions.ts
"use server";
import { Asset, CallPriority, WorkOrder, CallStatus, Incident } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {prisma} from "@/lib/prisma";

// Helper to get current user with tenant
async function getCurrentUser() {
  const user = await prisma.user.findUnique({
    where: { id: "CURRENT_USER_ID" }, // Replace with your auth logic
    include: { tenant: true }
  });

  if (!user || !user.tenant) redirect("/login");
  return user;
}

// Dashboard Data Fetching
export async function fetchDashboardData() {
  const user = await getCurrentUser();

  const [
    assets,
    calls,
    workOrders,
    parts,
    vendors
  ] = await Promise.all([
    prisma.asset.findMany({ where: { tenantId: user.tenantId } }),
    prisma.incident.findMany({ where: { tenantId: user.tenantId } }),
    prisma.workOrder.findMany({ where: { tenantId: user.tenantId } }),
    prisma.part.findMany({ where: { tenantId: user.tenantId } }),
    prisma.vendor.findMany({ where: { tenantId: user.tenantId } }),
  ]);

  return { 
    meta: user,
    assets, 
    calls, 
    workOrders, 
    parts, 
    vendors 
  };
}

// Call Actions
export async function endCall(callId: string) {
  try {
    await prisma.incident.update({
      where: { id: callId },
      data: { status: CallStatus.CLOSED }
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error ending call:", error);
    return { error: "Failed to update call" };
  }
}

export async function createWorkOrder(
  assetIds: string[],
  description: string,
  priority: CallPriority = CallPriority.LOW
) {
  const user = await getCurrentUser();

  // Validation
  if (!description || description.length < 10) {
    return { error: "Description must be at least 10 characters" };
  }

  try {
    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId: user.tenantId,
        description,
        priority,
        assets: {
          create: assetIds.map(assetId => ({
            asset: { connect: { id: assetId } }
          }))
        }
      },
      include: { assets: { include: { asset: true } } }
    });

    await prisma.workOrderLog.create({
      data: {
        workOrderId: workOrder.id,
        userId: user.id,
        action: "CREATED",
        details: { message: `Created by ${user.firstName} ${user.lastName}` }
      }
    });

    revalidatePath("/dashboard");
    return { 
      data: {
        ...workOrder,
        assets: workOrder.assets.map(wa => wa.asset) // Flatten the response
      } 
    };
  } catch (error) {
    console.error("Error creating work order:", error);
    return { error: "Failed to create work order" };
  }
}

// Asset Actions
export async function createAsset(input: { name: string; location: string }) {
  const user = await getCurrentUser();

  try {
    const asset = await prisma.asset.create({
      data: {
        tenantId: user.tenantId,
        ...input
      }
    });
    revalidatePath("/dashboard");
    return { data: asset };
  } catch (error) {
    console.error("Error creating asset:", error);
    return { error: "Failed to create asset" };
  }
}

// Call Creation
export async function createCall(input: { assetId: string; description: string }) {
  const user = await getCurrentUser();

  try {
    const call = await prisma.incident.create({
      data: {
        tenantId: user.tenantId,
        ...input,
        status: CallStatus.OPEN
      }
    });
    revalidatePath("/dashboard");
    return { data: call };
  } catch (error) {
    console.error("Error creating call:", error);
    return { error: "Failed to create call" };
  }
}