import { metrics, trace, type Attributes } from "@opentelemetry/api";

import type { RequestContext } from "@tnvios/request-context";

export interface HttpServerRequestMeasurement {
  readonly durationMs: number;
  readonly method?: string;
  readonly statusCode: number;
}

const meter = metrics.getMeter("@tnvios/telemetry");
const requestCount = meter.createCounter("tnvios.http.server.request.count", {
  description: "Number of completed HTTP server requests.",
  unit: "{request}",
});
const requestDuration = meter.createHistogram("tnvios.http.server.request.duration", {
  description: "Duration of completed HTTP server requests.",
  unit: "ms",
});

export function enrichActiveSpanWithRequestContext(context: RequestContext): void {
  trace.getActiveSpan()?.setAttributes(createRequestContextAttributes(context));
}

export function recordHttpServerRequest(measurement: HttpServerRequestMeasurement): void {
  const attributes: Attributes = {
    "http.request.method": measurement.method ?? "UNKNOWN",
    "http.response.status_code": measurement.statusCode,
  };

  requestCount.add(1, attributes);
  requestDuration.record(measurement.durationMs, attributes);
}

export function createRequestContextAttributes(context: RequestContext): Attributes {
  return {
    "tnvios.business_unit.id": context.businessUnitId ?? undefined,
    "tnvios.correlation.id": context.correlationId,
    "tnvios.department.id": context.departmentId ?? undefined,
    "tnvios.organization.id": context.organizationId ?? undefined,
    "tnvios.team.id": context.teamId ?? undefined,
    "tnvios.tenant.id": context.tenantId ?? undefined,
  };
}
