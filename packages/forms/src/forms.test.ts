import { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  createFormAuditEntry,
  defineForm,
  DraftConflictError,
  MemoryDraftStore,
  resolveFieldAccess,
  validateForm,
} from "./index";

const definition = defineForm({
  key: "operations.work.create",
  module: "operations",
  entity: "work_item",
  mode: "create",
  schema: z.object({ title: z.string().min(3), notes: z.string() }),
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
});

describe("platform form engine", () => {
  it("maps Zod issues to controlled field errors", () => {
    expect(validateForm(definition, { title: "", notes: "" }).errors.title).toBeDefined();
  });

  it("denies unspecified fields and resolves explicit access", () => {
    expect(resolveFieldAccess("title", { title: "editable" })).toBe("editable");
    expect(resolveFieldAccess("salary", {})).toBe("hidden");
  });

  it("creates an audit change set with old and new field values", () => {
    expect(
      createFormAuditEntry({
        definition,
        action: "submit",
        before: { title: "Old", notes: "" },
        after: { title: "New", notes: "" },
      }),
    ).toMatchObject({
      changedFields: ["title"],
      oldValues: { title: "Old" },
      newValues: { title: "New" },
    });
  });

  it("protects drafts with optimistic versions", async () => {
    const store = new MemoryDraftStore();
    await store.save("work", { values: { title: "A" }, version: 1, savedAt: new Date() }, 0);
    await expect(
      store.save("work", { values: { title: "B" }, version: 2, savedAt: new Date() }, 0),
    ).rejects.toBeInstanceOf(DraftConflictError);
  });
});
