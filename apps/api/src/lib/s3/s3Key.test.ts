import { describe, it, expect } from "vitest";
import {
  buildObjectKey,
  buildPublicUrl,
  keyBelongsToTenant,
  keyMatchesContactPrefix,
  S3KeyError,
  assertValidTenantId,
} from "./s3Key";

const TENANT = "123e4567-e89b-12d3-a456-426614174000";
const CONTACT = "223e4567-e89b-12d3-a456-426614174001";
const ENV = "dev";

describe("s3Key", () => {
  it("buildPublicUrl joins prefix and key", () => {
    expect(
      buildPublicUrl(
        "dev/tenants/x/a",
        "https://bucket.s3.region.amazonaws.com",
      ),
    ).toBe("https://bucket.s3.region.amazonaws.com/dev/tenants/x/a");
    expect(
      buildPublicUrl(
        "dev/tenants/x/a",
        "https://bucket.s3.region.amazonaws.com/",
      ),
    ).toBe("https://bucket.s3.region.amazonaws.com/dev/tenants/x/a");
  });

  it("buildObjectKey returns {env}/tenants/.../uuid.ext", () => {
    const key = buildObjectKey({
      storageEnv: ENV,
      tenantId: TENANT,
      entity: "products",
      entityId: "draft",
      mimeType: "image/png",
      fileName: "x.png",
    });
    expect(key).toMatch(
      /^dev\/tenants\/123e4567-e89b-12d3-a456-426614174000\/products\/draft\/[0-9a-f-]{36}\.png$/,
    );
  });

  it("rejects invalid storage env", () => {
    expect(() =>
      buildObjectKey({
        storageEnv: "production",
        tenantId: TENANT,
        entity: "library",
        entityId: "general",
        mimeType: "image/png",
      }),
    ).toThrow(S3KeyError);
  });

  it("rejects invalid tenant", () => {
    expect(() =>
      buildObjectKey({
        storageEnv: ENV,
        tenantId: "not-a-uuid",
        entity: "library",
        entityId: "general",
        mimeType: "image/png",
      }),
    ).toThrow(S3KeyError);
  });

  it("rejects invalid entity", () => {
    expect(() =>
      buildObjectKey({
        storageEnv: ENV,
        tenantId: TENANT,
        entity: "evil",
        entityId: "draft",
        mimeType: "image/png",
      }),
    ).toThrow(S3KeyError);
  });

  it("rejects path traversal in entityId", () => {
    expect(() =>
      buildObjectKey({
        storageEnv: ENV,
        tenantId: TENANT,
        entity: "products",
        entityId: "../other",
        mimeType: "image/png",
      }),
    ).toThrow(S3KeyError);
  });

  it("keyBelongsToTenant", () => {
    const k = `dev/tenants/${TENANT}/library/general/x`;
    expect(keyBelongsToTenant(k, TENANT, "dev")).toBe(true);
    expect(keyBelongsToTenant(k, TENANT, "prod")).toBe(false);
    expect(keyBelongsToTenant(k, CONTACT, "dev")).toBe(false);
    expect(
      keyBelongsToTenant(`dev/tenants/${TENANT}/../x`, TENANT, "dev"),
    ).toBe(false);
    expect(
      keyBelongsToTenant(`tenants/${TENANT}/library/x`, TENANT, "dev"),
    ).toBe(false);
  });

  it("keyMatchesContactPrefix", () => {
    const k = `dev/tenants/${TENANT}/contacts/${CONTACT}/uuid/file.pdf`;
    expect(keyMatchesContactPrefix(k, TENANT, CONTACT, "dev")).toBe(true);
    expect(keyMatchesContactPrefix(k, TENANT, "wrong", "dev")).toBe(false);
    expect(keyMatchesContactPrefix(k, TENANT, CONTACT, "stage")).toBe(false);
  });

  it("assertValidTenantId", () => {
    expect(() => assertValidTenantId("x")).toThrow(S3KeyError);
  });
});
