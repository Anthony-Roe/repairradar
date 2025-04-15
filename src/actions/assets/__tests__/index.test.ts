import { PrismaClient, Prisma } from "@prisma/client";
import { createAsset } from "../index";

const prisma = new PrismaClient();

describe("Asset Actions", () => {
  afterEach(async () => {
    await prisma.asset.deleteMany();
    await prisma.assetType.deleteMany();
    await prisma.tenant.deleteMany();
  });

  it("should create an asset with metadata and relations", async () => {
    const tenant = await prisma.tenant.create({
      data: { name: "Test Tenant" },
    });
    const assetType = await prisma.assetType.create({
      data: { name: "Machine", tenantId: tenant.id },
    });

    const data: Prisma.AssetUncheckedCreateInput = {
      tenantId: tenant.id,
      name: "Test Asset",
      status: "ACTIVE",
      assetTypeId: assetType.id,
      metadata: { serial: "12345" },
    };

    const asset = await createAsset(data);

    expect(asset).toMatchObject({
      name: "Test Asset",
      tenantId: tenant.id,
      assetTypeId: assetType.id,
      metadata: { serial: "12345" },
    });
  });
});