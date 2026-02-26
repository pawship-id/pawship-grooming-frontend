import { type NextRequest, NextResponse } from "next/server"

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://api-pawship-grooming.zullstack.dev"

function buildTargetUrl(pathSegments: string[], request: NextRequest) {
  const normalizedPath = pathSegments.join("/")
  const query = request.nextUrl.search
  return `${BACKEND_API_BASE_URL}/${normalizedPath}${query}`
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const targetUrl = buildTargetUrl(pathSegments, request)

  const headers = new Headers(request.headers)
  headers.delete("host")
  headers.delete("content-length")

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

  const responseBody = await upstreamResponse.arrayBuffer()

  return new NextResponse(responseBody, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
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
