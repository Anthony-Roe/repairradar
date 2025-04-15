"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Prisma } from "@prisma/client";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createUser, updateUser } from "@/actions/users";
import { toast } from "sonner";

interface UserModalProps {
  user?: Prisma.UserGetPayload<{}>;
  tenantId: string;
}

export function UserModal({ user, tenantId }: UserModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Prisma.UserUncheckedCreateInput>({
    tenantId,
    name: user?.name ?? "",
    email: user?.email ?? "",
    employeeId: user?.employeeId ?? "",
    role: user?.role ?? "TECHNICIAN",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.employeeId) {
      toast.error("Name, email, and employee ID are required");
      return;
    }
    try {
      if (user?.id) {
        await updateUser(user.id, {
          name: formData.name,
          email: formData.email,
          employeeId: formData.employeeId,
          role: formData.role,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
        toast.success("User updated successfully");
      } else {
        await createUser(formData);
        toast.success("User created successfully");
      }
      router.back();
    } catch (error) {
      toast.error("Failed to save user");
      console.error(error);
    }
  };

  return (
    <Dialog open onOpenChange={() => router.back()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Create User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name">Name</label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="employeeId">Employee ID</label>
            <Input
              id="employeeId"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="role">Role</label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value as "TECHNICIAN" | "SUPERVISOR" | "MANAGER" | "ADMIN" | "SUPER_ADMIN" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TECHNICIAN">Technician</SelectItem>
                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!user && (
            <div>
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                value={formData.password as string}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit">{user ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}