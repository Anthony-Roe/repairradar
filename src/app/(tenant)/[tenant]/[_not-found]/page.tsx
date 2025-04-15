"use client"
import {  redirect } from "next/navigation";
import { useTenant } from "@/components/TenantProvider";

export default function CatchAll() {
    const tenant = useTenant();
    return redirect(`/${tenant.subdomain}`)
  }
