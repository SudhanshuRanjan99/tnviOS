import { createEntityId, parseEntityId, type EntityId } from "@tnvios/database/identifiers";

import type { RequestContext } from "./request-context.js";

export const REQUEST_HEADER_NAMES = {
  businessUnitId: "x-business-unit-id",
  correlationId: "x-correlation-id",
  departmentId: "x-department-id",
  organizationId: "x-organization-id",
  teamId: "x-team-id",
  tenantId: "x-tenant-id",
} as const;

export type RequestHeaderValue = string | readonly string[] | undefined;
export type RequestHeaders = Readonly<Record<string, RequestHeaderValue>>;

export class InvalidRequestContextHeaderError extends Error {
  readonly headerName: string;

  constructor(headerName: string) {
    super(`Request header "${headerName}" must contain one valid UUID.`);
    this.name = "InvalidRequestContextHeaderError";
    this.headerName = headerName;
  }
}

export function createRequestContext(headers: RequestHeaders): RequestContext {
  return {
    businessUnitId: parseOptionalHeader<"business_unit">(
      headers,
      REQUEST_HEADER_NAMES.businessUnitId,
    ),
    correlationId:
      parseOptionalHeader<"correlation">(headers, REQUEST_HEADER_NAMES.correlationId) ??
      createEntityId<"correlation">(),
    departmentId: parseOptionalHeader<"department">(headers, REQUEST_HEADER_NAMES.departmentId),
    organizationId: parseOptionalHeader<"organization">(
      headers,
      REQUEST_HEADER_NAMES.organizationId,
    ),
    teamId: parseOptionalHeader<"team">(headers, REQUEST_HEADER_NAMES.teamId),
    tenantId: parseOptionalHeader<"tenant">(headers, REQUEST_HEADER_NAMES.tenantId),
  };
}

function parseOptionalHeader<EntityName extends string>(
  headers: RequestHeaders,
  headerName: string,
): EntityId<EntityName> | null {
  const value = headers[headerName];

  if (value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new InvalidRequestContextHeaderError(headerName);
  }

  try {
    return parseEntityId<EntityName>(value);
  } catch {
    throw new InvalidRequestContextHeaderError(headerName);
  }
}
