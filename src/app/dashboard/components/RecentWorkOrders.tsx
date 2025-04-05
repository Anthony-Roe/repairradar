// src/app/dashboard/components/RecentWorkOrders.tsx
'use client';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { 
  Badge 
} from "@/components/ui/badge";
import { 
  CalendarDays,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Pencil,
  Check,
  X
} from "lucide-react";
import { 
  WorkOrder, 
  WorkOrderPriority,
  WorkOrderStatus 
} from "@/lib/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateWorkOrder } from "@/app/dashboard/actions";
import { toast } from "sonner";

const workOrderSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.nativeEnum(WorkOrderPriority),
  status: z.nativeEnum(WorkOrderStatus),
  dueDate: z.string().optional()
});

interface RecentWorkOrdersProps {
  workOrders: WorkOrder[];
  onUpdate?: (updatedWorkOrder: WorkOrder) => void;
  onAddNote?: (workOrderId: string, note: string) => Promise<void>;
}

export default function RecentWorkOrders({ 
  workOrders,
  onUpdate,
  onAddNote
}: RecentWorkOrdersProps) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState("");

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
    setIsEditing(false);
    setNewNote("");
  };

  const handleAddNote = async (workOrderId: string) => {
    if (!newNote.trim()) return;
    
    try {
      if (onAddNote) {
        await onAddNote(workOrderId, newNote);
        setNewNote("");
        toast.success("Note added successfully");
      }
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Recent Work Orders
        </CardTitle>
        <CardDescription>Last 5 created work orders</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.slice(0, 5).map((wo) => (
              <>
                <TableRow key={wo.id} onClick={() => toggleExpand(wo.id)} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <div className="line-clamp-1">{wo.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{wo.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        wo.priority === "HIGH" || wo.priority === "CRITICAL"
                          ? "destructive"
                          : wo.priority === "MEDIUM"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {wo.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(wo.id);
                      }}
                    >
                      {expandedOrder === wo.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
                
                {expandedOrder === wo.id && (
                  <TableRow>
                    <TableCell colSpan={4} className="p-0">
                      <div className="p-4 border-t">
                        {isEditing ? (
                          <WorkOrderEditForm 
                            workOrder={wo} 
                            onCancel={() => setIsEditing(false)}
                            onSave={(updatedData) => {
                              if (onUpdate) {
                                onUpdate({ ...wo, ...updatedData });
                              }
                              setIsEditing(false);
                            }}
                          />
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="text-sm font-medium">Description</h4>
                                <p className="text-sm">{wo.description}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium">Status</h4>
                                <p className="text-sm">{wo.status}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium">Priority</h4>
                                <p className="text-sm">{wo.priority}</p>
                              </div>
                              {wo.dueDate && (
                                <div>
                                  <h4 className="text-sm font-medium">Due Date</h4>
                                  <p className="text-sm">
                                    {new Date(wo.dueDate).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setIsEditing(true)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                            </div>
                            
                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium mb-2">Add Note</h4>
                              <div className="flex gap-2">
                                <Textarea
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                                  placeholder="Add a note about this work order..."
                                  className="flex-1"
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAddNote(wo.id)}
                                  disabled={!newNote.trim()}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function WorkOrderEditForm({ 
  workOrder, 
  onCancel, 
  onSave 
}: { 
  workOrder: WorkOrder;
  onCancel: () => void;
  onSave: (data: Partial<WorkOrder>) => void;
}) {
  const { register, handleSubmit, formState: { errors }, control } = useForm({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      description: workOrder.description,
      priority: workOrder.priority,
      status: workOrder.status,
      dueDate: workOrder.dueDate || ''
    }
  });

  const onSubmit = async (data: any) => {
    try {
      // Update the work order
      const updatedData = {
        description: data.description,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate || null
      };
      
      const { error } = await updateWorkOrder(workOrder.id, updatedData);
      
      if (error) throw new Error(error);
      
      onSave(updatedData);
      toast.success("Work order updated successfully");
    } catch (error) {
      toast.error("Failed to update work order");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            {...register("description")}
            className="mt-1"
          />
          {errors.description && (
            <p className="text-sm text-destructive mt-1">
              {errors.description.message}
            </p>
          )}
        </div>
        
        <div>
          <label className="text-sm font-medium">Status</label>
          <select
            {...register("status")}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
          >
            {Object.values(WorkOrderStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Priority</label>
          <select
            {...register("priority")}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
          >
            {Object.values(WorkOrderPriority).map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Due Date</label>
          <Input
            type="date"
            {...register("dueDate")}
            className="mt-1"
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button 
          variant="outline" 
          type="button"
          onClick={onCancel}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit">
          <Check className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </form>
  );
}