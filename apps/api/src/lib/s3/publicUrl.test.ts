import { describe, it, expect } from "vitest";
import { isClientPublicUrlCompatible } from "./publicUrl";

describe("publicUrl", () => {
  const key = "dev/tenants/t/library/general/x.png";

  it("allows omit client url", () => {
    expect(
      isClientPublicUrlCompatible(key, undefined, "https://b.example/", []),
    ).toBe(true);
    expect(isClientPublicUrlCompatible(key, "", "https://b.example/", [])).toBe(
      true,
    );
  });

  it("accepts primary or alias URL", () => {
    const primary = "https://b.example/";
    const url = "https://b.example/dev/tenants/t/library/general/x.png";
    expect(isClientPublicUrlCompatible(key, url, primary, [])).toBe(true);
    expect(
      isClientPublicUrlCompatible(
        key,
        "https://cdn.example/dev/tenants/t/library/general/x.png",
        primary,
        ["https://cdn.example/"],
      ),
    ).toBe(true);
  });

  it("rejects mismatched client url", () => {
    expect(
      isClientPublicUrlCompatible(
        key,
        "https://evil.example/dev/tenants/t/library/general/x.png",
        "https://b.example/",
        [],
      ),
    ).toBe(false);
  });
});
