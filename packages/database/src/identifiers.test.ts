import { describe, expect, it } from "vitest";

import {
  createEntityId,
  InvalidEntityIdError,
  isEntityId,
  isUuidV7,
  parseEntityId,
} from "./identifiers.js";

describe("database identifiers", () => {
  it("creates UUIDv7 entity IDs", () => {
    const id = createEntityId<"tenant">();

    expect(isEntityId(id)).toBe(true);
    expect(isUuidV7(id)).toBe(true);
  });

  it("parses valid UUIDs into typed entity IDs", () => {
    const id = createEntityId<"organization">();

    expect(parseEntityId<"organization">(id)).toBe(id);
  });

  it("rejects invalid entity IDs without echoing the input", () => {
    const invalidId = "not-a-uuid";

    expect(() => parseEntityId(invalidId)).toThrowError(InvalidEntityIdError);

    try {
      parseEntityId(invalidId);
      expect.fail("Expected entity ID parsing to fail");
    } catch (error) {
      expect(String(error)).not.toContain(invalidId);
    }
  });
});
