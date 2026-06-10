import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import { setResolvedOrganizationContext } from "../organization/resolved-context.js";
import { FilesController } from "./files.controller.js";
import type { FilesService } from "./files.service.js";

describe("FilesController", () => {
  it("registers files within the resolved organization context", async () => {
    const service = {
      register: vi.fn(async () => ({ file: { id: "file-id" }, upload: { url: "signed" } })),
    } as unknown as FilesService;
    const context = {
      tenantId: createEntityId<"tenant">(),
      organizationId: createEntityId<"organization">(),
      businessUnitId: null,
      departmentId: null,
      teamId: null,
      membershipId: createEntityId<"membership">(),
      userId: createEntityId<"user">(),
    };
    const request = {};
    setResolvedOrganizationContext(request, context);
    const input = { fileName: "report.pdf", mimeType: "application/pdf", fileSize: 100 };
    await new FilesController(service).register(request, input);
    expect(service.register).toHaveBeenCalledWith(context, input);
  });
});
