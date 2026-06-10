import { describe, expect, it } from "vitest";

import { createEntityId } from "@tnvios/database/identifiers";

import {
  RequestContextStore,
  RequestContextUnavailableError,
  type RequestContext,
} from "./request-context.js";

const context: RequestContext = {
  businessUnitId: null,
  correlationId: createEntityId<"correlation">(),
  departmentId: null,
  organizationId: createEntityId<"organization">(),
  teamId: null,
  tenantId: createEntityId<"tenant">(),
};

describe("RequestContextStore", () => {
  it("preserves context through asynchronous work", async () => {
    const store = new RequestContextStore();

    await store.run(context, async () => {
      await Promise.resolve();

      expect(store.require()).toBe(context);
    });
  });

  it("isolates concurrent request contexts", async () => {
    const store = new RequestContextStore();
    const secondContext = {
      ...context,
      correlationId: createEntityId<"correlation">(),
    };

    const values = await Promise.all([
      store.run(context, async () => {
        await Promise.resolve();
        return store.require().correlationId;
      }),
      store.run(secondContext, async () => {
        await Promise.resolve();
        return store.require().correlationId;
      }),
    ]);

    expect(values).toEqual([context.correlationId, secondContext.correlationId]);
  });

  it("fails explicitly outside a request scope", () => {
    expect(() => new RequestContextStore().require()).toThrowError(RequestContextUnavailableError);
  });
});
