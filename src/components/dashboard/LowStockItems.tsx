"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bold, Package } from "lucide-react";
import { Part } from "@prisma/client";

interface LowStockProps {
    parts: Part[];
}

export function LowStockItems({
    parts
}: LowStockProps) {
  const lowStock = parts.filter((part) => part.quantity <= part.minStock);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Low Stock Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {lowStock.slice(0, 3).map((part) => (
            <div key={part.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{part.name}
                <p className="text-sm text-muted-foreground inline">
                  <p className="text-destructive font-bold inline"> {part.quantity}</p> Remaining
                </p>
                </p>
              </div>
              <Button variant="outline" size="sm">
                Order
              </Button>
            </div>
          ))}
          {lowStock.length > 3 && (
            <Button variant="ghost" className="w-full">
              View all ({lowStock.length})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}