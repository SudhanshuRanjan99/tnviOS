import { NextResponse, type NextRequest } from "next/server";

const apiBase = process.env.TNVIOS_API_URL ?? "http://localhost:4000/api/v1";

async function forward(request: NextRequest, path: readonly string[]) {
  try {
    const headers = new Headers();
    for (const name of ["authorization", "content-type", "x-tenant-id", "x-organization-id"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await fetch(`${apiBase}/crm/${path.join("/")}`, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
    });
    const text = await response.text();
    return new NextResponse(text || JSON.stringify({
      code: "EMPTY_API_RESPONSE",
      message: `The API returned an empty response (${response.status}).`,
    }), {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json(
      {
        code: "API_UNAVAILABLE",
        message: "The Tnvios API is not running. Start it on http://localhost:4000 and try again.",
      },
      { status: 503 },
    );
  }
}

type CrmRouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: CrmRouteContext) {
  return forward(request, (await context.params).path);
}
export async function POST(request: NextRequest, context: CrmRouteContext) {
  return forward(request, (await context.params).path);
}
