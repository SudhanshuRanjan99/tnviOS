import { Controller, Get } from "@nestjs/common";

export interface HealthResponse {
  readonly data: {
    readonly service: "api";
    readonly status: "ok";
  };
  readonly meta: Record<string, never>;
  readonly success: true;
}

@Controller("health")
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
