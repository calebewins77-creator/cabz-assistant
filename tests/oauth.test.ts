import { describe, it, expect } from "vitest";
import { canManageGuild } from "../src/web/oauth";

describe("canManageGuild", () => {
  it("allows guild owners regardless of permission bits", () => {
    expect(canManageGuild("0", true)).toBe(true);
  });

  it("allows Administrator (0x8)", () => {
    expect(canManageGuild(String(0x8), false)).toBe(true);
  });

  it("allows Manage Guild (0x20)", () => {
    expect(canManageGuild(String(0x20), false)).toBe(true);
  });

  it("denies members without either permission", () => {
    expect(canManageGuild(String(0x1 | 0x2), false)).toBe(false);
  });

  it("handles large permission bitfields (bigint-safe)", () => {
    const bigPerms = (BigInt(1) << BigInt(40)) | BigInt(0x8);
    expect(canManageGuild(bigPerms.toString(), false)).toBe(true);
  });
});
