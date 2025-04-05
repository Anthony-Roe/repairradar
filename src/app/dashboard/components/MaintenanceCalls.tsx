"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ChevronDown, ChevronUp, Check, MessageSquare } from "lucide-react";
import { Asset, Call, CallStatus } from "@/lib/types";
import { Dispatch, SetStateAction } from "react";

interface MaintProps {
    calls: Call[],
  assets: Asset[],
  expandedCall: string | null,
  setExpandedCall: Dispatch<SetStateAction<string | null>>,
  handleEndCall: (id: string) => Promise<void>,
}

export default function MaintenanceCalls({
  calls,
  assets,
  expandedCall,
  setExpandedCall,
  handleEndCall
}: MaintProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Maintenance Calls
          </CardTitle>
          <Badge variant="outline" className="px-3 py-1">
            {calls.filter((call) => call.status !== CallStatus.CLOSED).length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {calls
            .filter((call) => call.status !== CallStatus.CLOSED)
            .map((call) => (
              <div key={call.id} className="rounded-lg border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {assets.find((asset) => asset.id === call.assetId)?.name || "Unknown Asset"}
                      <Badge variant="outline">
                        {assets.find((asset) => asset.id === call.assetId)?.location || "No Location"}
                      </Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">{call.issue}</p>
                  </div>
                  <Badge variant={call.status === CallStatus.OPEN ? "destructive" : "secondary"}>
                    {call.status}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-1 h-4 w-4" />
                    {new Date(call.callTime).toLocaleTimeString()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                    >
                      {expandedCall === call.id ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      <span>Details</span>
                    </Button>
                    <Button
                      onClick={() => handleEndCall(call.id)}
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Resolve</span>
                    </Button>
                  </div>
                </div>
                {expandedCall === call.id && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Priority</p>
                        <Badge variant="destructive">High</Badge>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Add Note
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}