import NextAuth from "next-auth";
import { Tenant, UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
      employeeId: string;
      tenantId: string;
      role: UserRole;
    };
  }

  interface User {
    id: string;
    name?: string;
    email?: string;
    employeeId: string;
    tenantId: string;
    role: UserRole;
  }

  interface JWT {
    id: string;
    employeeId: string;
    tenantId: string;
    role: UserRole;
  }
}