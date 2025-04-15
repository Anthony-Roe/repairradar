// src/app/dashboard/components/AssetStatus.tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HardHat } from "lucide-react";
import { Asset, CallStatus, Incident } from "@/prisma";

interface AssetStatusProps {
  assets: Asset[];
  calls: Incident[];
}

export default function AssetStatusComp({ assets, calls }: AssetStatusProps) {
  const totalAssets = assets.length;
  const downAssets = calls.filter(call => 
    call.status !== CallStatus.CLOSED && 
    assets.some(asset => asset.id === call.assetId)
  ).length;
  const operationalPercentage = totalAssets > 0 
    ? Math.round(((totalAssets - downAssets) / totalAssets) * 100) 
    : 100;
  const downPercentage = totalAssets > 0 
    ? Math.round((downAssets / totalAssets) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardHat className="w-5 h-5" />
          Asset Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Operational</span>
              <span className="text-sm font-medium">{operationalPercentage}%</span>
            </div>
            <Progress value={operationalPercentage} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Down for Maintenance</span>
              <span className="text-sm font-medium">{downPercentage}%</span>
            </div>
            <Progress value={downPercentage} className="h-2 bg-destructive" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}