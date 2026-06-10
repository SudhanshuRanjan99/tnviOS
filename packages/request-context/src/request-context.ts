import { AsyncLocalStorage } from "node:async_hooks";

import type {
  BusinessUnitId,
  DepartmentId,
  OrganizationId,
  TeamId,
  TenantId,
} from "@tnvios/database/contracts";
import type { EntityId } from "@tnvios/database/identifiers";

export interface RequestContext {
  readonly businessUnitId: BusinessUnitId | null;
  readonly correlationId: EntityId<"correlation">;
  readonly departmentId: DepartmentId | null;
  readonly organizationId: OrganizationId | null;
  readonly teamId: TeamId | null;
  readonly tenantId: TenantId | null;
}

export class RequestContextUnavailableError extends Error {
  constructor() {
    super("Request context is unavailable outside an active request scope.");
    this.name = "RequestContextUnavailableError";
  }
}

export class RequestContextStore {
  readonly #storage = new AsyncLocalStorage<RequestContext>();

  get(): RequestContext | undefined {
    return this.#storage.getStore();
  }

  require(): RequestContext {
    const context = this.get();

    if (context === undefined) {
      throw new RequestContextUnavailableError();
    }

    return context;
  }

  run<Result>(context: RequestContext, work: () => Result): Result {
    return this.#storage.run(context, work);
  }
}

export const requestContextStore = new RequestContextStore();
