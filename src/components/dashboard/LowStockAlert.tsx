// src/app/(tenant)/[tenant]/dashboard/components/LowStockAlert.tsx
"use client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Part } from "@prisma/client";

interface LowStockAlertProps {
  parts: Part[];
}

export function LowStockAlert({ parts }: LowStockAlertProps) {
  const criticalParts = parts.filter(
    (part) => part.quantity <= part.minStock * 0.5
  ); // Alert for parts at 50% or less of minStock

  if (criticalParts.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Critical Stock Alert</AlertTitle>
      <AlertDescription>
        {criticalParts.length} item(s) are critically low. Please reorder:
        <ul className="list-disc pl-4">
          {criticalParts.slice(0, 3).map((part) => (
            <li key={part.id}>
              {part.name} ({part.quantity} remaining)
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}