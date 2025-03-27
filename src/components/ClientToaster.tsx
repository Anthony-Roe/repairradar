"use client";
import { Toaster, toast } from "sonner";

export default function ClientToaster() {
  return <Toaster richColors theme="system" />;
}

export { toast };