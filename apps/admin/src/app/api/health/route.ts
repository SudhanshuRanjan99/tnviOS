export interface AdminHealthResponse {
  readonly data: {
    readonly service: "admin";
    readonly status: "ok";
  };
  readonly meta: Record<string, never>;
  readonly success: true;
}

export function GET(): Response {
  const response: AdminHealthResponse = {
    data: {
      service: "admin",
      status: "ok",
    },
    meta: {},
    success: true,
  };

  return Response.json(response);
}
