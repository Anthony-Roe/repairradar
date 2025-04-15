// src/app/(tenant)/[tenant]/dashboard/components/WorkOrdersTable.tsx
"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Prisma } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "../ui";

interface WorkOrdersTableProps {
  workOrders: Prisma.WorkOrderGetPayload<{}>[];
}

export function WorkOrdersTable({ workOrders }: WorkOrdersTableProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Work Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.description || `Order #${order.id}`}</TableCell>
                <TableCell>{order.status || "Pending"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/work-order/${order.id}`)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}