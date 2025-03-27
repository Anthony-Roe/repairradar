"use client";
import { useState, useCallback, useEffect } from "react";
import { Button, Input, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { EditDialog } from "@/components/EditDialog";
import { toast } from "sonner";
import { Check, ChevronDown, Edit, Loader2, Phone, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Call } from "@prisma/client";
import { dynamicFetch, useAssetData, useCallData } from "@/shared/lib/hooks";
import router from "next/router";
import { useSession } from "next-auth/react";

export default function CallsPage({ tenant }: { tenant: string }) {
  const {status} = useSession();
  const { data: calls = [], isLoading: callsLoading, refetch: refetchCalls } = useCallData(tenant);
  const { data: assets = [], isLoading: assetsLoading } = useAssetData(tenant);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"callTime" | "status">("callTime");
  const [statusFilter, setStatusFilter] = useState<"all" | Call["status"]>("all");
  const [newCall, setNewCall] = useState({ issue: "", assetId: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredCalls = useCallback(() => {
    const filtered = calls
      .filter((call) => {
        const matchesSearch =
          searchTerm === "" ||
          call.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assets.some((a) => a.id === call.assetId && a.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === "all" || call.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) =>
        sortField === "callTime"
          ? new Date(b.callTime).getTime() - new Date(a.callTime).getTime()
          : a.status.localeCompare(b.status)
      );
    console.log("Filtered calls:", filtered.map((c) => ({ id: c.id, issue: c.issue }))); // Debug keys
    return filtered;
  }, [calls, assets, searchTerm, statusFilter, sortField]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetchCalls()]);
    setIsRefreshing(false);
  }, [refetchCalls]);

  const handleCreateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCall.issue || !newCall.assetId) return toast.error("Issue and asset are required");
    await dynamicFetch<Call>("calls", tenant, "POST", { body: newCall });
    setNewCall({ issue: "", assetId: "" });
    setIsCreating(false);
    await handleRefresh();
    toast.success("Call created successfully");
  };

  const handleUpdateSubmit = async (data: Partial<Call>) => {
    if (!currentCall) return;
    await dynamicFetch<Call>("calls", tenant, "PUT", { id: currentCall.id, body: data });
    await handleRefresh();
    setEditDialogOpen(false);
    toast.success("Call updated successfully");
  };

  const handleDeleteCall = async (id: string) => {
    if (!confirm("Are you sure you want to delete this call?")) return;
    await dynamicFetch("calls", tenant, "DELETE", { id });
    await handleRefresh();
    toast.success("Call deleted successfully");
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      handleRefresh();
    }
  }, [status, handleRefresh]);

  if (callsLoading || assetsLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Service Calls</h1>
          <p className="text-muted-foreground">Manage incoming service requests</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button onClick={() => setIsCreating(!isCreating)}>
            <Plus className="h-4 w-4 mr-2" />
            New Call
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Call Log</CardTitle>
              <CardDescription>
                {filteredCalls().length} {filteredCalls().length === 1 ? 'call' : 'calls'} found
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search calls..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select 
                value={sortField} 
                onValueChange={(val) => setSortField(val as 'callTime' | 'status')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="callTime">Call Time</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={statusFilter} 
                onValueChange={(val) => setStatusFilter(val as 'all' | Call["status"])}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isCreating && (
            <form onSubmit={handleCreateCall} className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1 block">
                    Issue Description *
                  </label>
                  <Input
                    value={newCall.issue}
                    onChange={(e) => setNewCall({...newCall, issue: e.target.value})}
                    placeholder="Describe the issue..."
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1 block">
                    Asset *
                  </label>
                  <Select 
                    value={newCall.assetId}
                    onValueChange={(value) => setNewCall({...newCall, assetId: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={!newCall.issue || !newCall.assetId}>
                    <Phone className="h-4 w-4 mr-2" />
                    Log Call
                  </Button>
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}

          <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow key="header">
                <TableHead>Issue</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Call Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCalls().length === 0 ? (
                <TableRow key="no-calls">
                  <TableCell colSpan={5} className="h-24 text-center">
                    {searchTerm ? "No matching calls found" : "No calls available"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCalls().map((call) => {
                  const asset = assets.find((a) => a.id === call.assetId);
                  return (
                    <TableRow key={call.id || `call-${Math.random()}`}>
                      <TableCell className="font-medium">{call.issue}</TableCell>
                      <TableCell>{asset?.name || <span className="text-muted-foreground">No asset</span>}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            call.status === "CLOSED"
                              ? "destructive"
                              : call.status === "IN_PROGRESS"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {call.status === "OPEN" && <Phone className="h-3 w-3 mr-1" />}
                          {call.status === "IN_PROGRESS" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {call.status === "CLOSED" && <Check className="h-3 w-3 mr-1" />}
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(call.callTime).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setCurrentCall(call);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteCall(call.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        </CardContent>
      </Card>
      
      <EditDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setCurrentCall(null);
        }}
        title="Update Call Status"
        description="Change the status of this service call"
        initialData={{
          status: currentCall?.status || 'OPEN',
          id: currentCall?.id || '',
        }}
        fields={[
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'OPEN', label: 'Open' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'CLOSED', label: 'Closed' }
            ]
          }
        ]}
        onSubmit={handleUpdateSubmit}
      />
    </div>
  );
}