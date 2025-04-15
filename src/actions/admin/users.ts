// src/app/(tenant)/[tenant]/users/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { requireAuth } from '@/lib/auth';

export async function createUser({
  name,
  email,
  employeeId,
  role,
  tenantId,
  firstName,
  lastName,
  password,
}: {
  name: string;
  email: string;
  employeeId: string;
  role: UserRole;
  tenantId: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}) {
  try {
    const { user } = await requireAuth();
    if (!user || user.role !== UserRole.ADMIN) {
      throw new Error('Unauthorized');
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        employeeId,
        role,
        tenantId,
        firstName,
        lastName,
        password,
      },
    });

    return { error: null, user: newUser };
  } catch (error) {
    return { error: 'Failed to create user' };
  }
}

export async function updateUser(
  userId: string,
  data: Partial<{
    name: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    password: string;
  }>
) {
  try {
    const { user } = await requireAuth();
    if (!user || user.role !== UserRole.ADMIN) {
      throw new Error('Unauthorized');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return { error: null, user: updatedUser };
  } catch (error) {
    return { error: 'Failed to update user' };
  }
}

export async function deleteUser(userId: string) {
  try {
    const { user } = await requireAuth();
    if (!user || user.role !== UserRole.ADMIN) {
      throw new Error('Unauthorized');
    }

    const deletedUser = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return { error: null, user: deletedUser };
  } catch (error) {
    return { error: 'Failed to delete user' };
  }
}

export async function fetchUsers(tenantId: string) {
  try {
    const { user } = await requireAuth();
    if (!user || user.tenantId !== tenantId) {
      throw new Error('Unauthorized');
    }

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        createdAt: true,
      },
    });

    return { error: null, users };
  } catch (error) {
    return { error: 'Failed to fetch users' };
  }
}

export async function fetchUser(userId: string) {
  try {
    const { user } = await requireAuth();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const foundUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        tenantId: true,
        createdAt: true,
      },
    });

    if (!foundUser || foundUser.tenantId !== user.tenantId) {
      throw new Error('Invalid user');
    }

    return { error: null, user: foundUser };
  } catch (error) {
    return { error: 'Failed to fetch user' };
  }
}