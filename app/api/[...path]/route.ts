import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL

const STRIPPED_REQUEST_HEADERS = [
  "host",
  "content-length",
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "content-encoding",
]

function buildTargetUrl(pathSegments: string[], request: NextRequest) {
  const normalizedPath = pathSegments.join("/")
  const query = request.nextUrl.search
  return `${BACKEND_API_BASE_URL}/${normalizedPath}${query}`
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  if (!BACKEND_API_BASE_URL) {
    return NextResponse.json(
      { statusCode: 500, message: "BACKEND_API_BASE_URL is not configured" },
      { status: 500 },
    )
  }

  const targetUrl = buildTargetUrl(pathSegments, request)

  const headers = new Headers(request.headers)
  for (const h of STRIPPED_REQUEST_HEADERS) headers.delete(h)

  try {
    const requestBody = request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer()

    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: requestBody,
      redirect: "manual",
    })

    const responseHeaders = new Headers(upstreamResponse.headers)
    responseHeaders.delete("content-encoding")
    responseHeaders.delete("content-length")
    responseHeaders.delete("transfer-encoding")

    const contentType = upstreamResponse.headers.get("content-type") ?? ""
    if (contentType.includes("text/event-stream")) {
      responseHeaders.set("X-Accel-Buffering", "no")
      return new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      })
    }

    const responseBody = await upstreamResponse.arrayBuffer()

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    const cause =
      error instanceof Error && "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined

    console.error("[api-proxy] upstream request failed", {
      method: request.method,
      targetUrl,
      message,
      cause,
      stack,
    })

    return NextResponse.json(
      {
        statusCode: 500,
        message: `Proxy error: ${message}`,
        targetUrl,
        cause: cause ? String(cause) : undefined,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyRequest(request, path)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyRequest(request, path)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyRequest(request, path)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyRequest(request, path)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return proxyRequest(request, path)
}
