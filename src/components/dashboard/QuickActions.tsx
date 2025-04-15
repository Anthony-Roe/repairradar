"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarDays, Package, HardHat, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function QuickActions() {
  const router = useRouter();
  const params = useParams();
  const subdomain = params.tenant as string;

  const handleNavigate = (modal: string) => {
    router.push(`/${subdomain}/${modal}/new`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => handleNavigate("incident")}
          >
            <AlertTriangle className="h-6 w-6" />
            <span>New Call</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => handleNavigate("work-order")}
          >
            <CalendarDays className="h-6 w-6" />
            <span>New Work Order</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => handleNavigate("part")}
          >
            <Package className="h-6 w-6" />
            <span>Add Part</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => handleNavigate("asset")}
          >
            <HardHat className="h-6 w-6" />
            <span>Add Asset</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}