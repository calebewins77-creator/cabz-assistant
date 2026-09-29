import { describe, it, expect } from "vitest";
import { extractUserId } from "../src/discord/resolve";

describe("extractUserId", () => {
  it("extracts a plain snowflake", () => {
    expect(extractUserId("123456789012345678")).toBe("123456789012345678");
  });

  it("extracts from a mention", () => {
    expect(extractUserId("<@123456789012345678>")).toBe("123456789012345678");
  });

  it("extracts from a nickname mention", () => {
    expect(extractUserId("<@!123456789012345678>")).toBe("123456789012345678");
  });

  it("rejects malformed input", () => {
    expect(extractUserId("not-a-user")).toBeNull();
    expect(extractUserId("123")).toBeNull();
    expect(extractUserId("<@abc>")).toBeNull();
  });
});
