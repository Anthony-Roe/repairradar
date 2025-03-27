// src/shared/modules/assets/types.ts
export interface AssetWithDeleted {
  id: string;
  name: string;
  tenantId: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateAssetInput {
  name: string;
  location?: string;
  tenantId: string;
}

export interface UpdateAssetInput {
  id: string;
  name?: string;
  location?: string | null;
}