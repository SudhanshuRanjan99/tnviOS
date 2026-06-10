import { Controller, Get } from "@nestjs/common";

import { PublicRoute } from "../auth/public-route.decorator.js";
import { SkipOrganizationContext } from "../organization/context.decorator.js";

export interface HealthResponse {
  readonly data: {
    readonly service: "api";
    readonly status: "ok";
  };
  readonly meta: Record<string, never>;
  readonly success: true;
}

@Controller("health")
@PublicRoute()
@SkipOrganizationContext()
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      data: {
        service: "api",
        status: "ok",
      },
      meta: {},
      success: true,
    };
  }
}
