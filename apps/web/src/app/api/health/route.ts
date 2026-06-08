export interface WebHealthResponse {
  readonly data: {
    readonly service: "web";
    readonly status: "ok";
  };
  readonly meta: Record<string, never>;
  readonly success: true;
}

export function GET(): Response {
  const response: WebHealthResponse = {
    data: {
      service: "web",
      status: "ok",
    },
    meta: {},
    success: true,
  };

  return Response.json(response);
}
