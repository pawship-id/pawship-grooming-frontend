import { type NextRequest, NextResponse } from "next/server"

// Proxy to wilayah.id which does not send CORS headers.
// Forwards GET /api/wilayah/<segments> -> https://wilayah.id/api/<segments>
// Responses are cached for 1 day on the edge since regions data is static.

const UPSTREAM = "https://wilayah.id/api"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  const target = `${UPSTREAM}/${path.join("/")}`

  try {
    const upstream = await fetch(target, {
      // Cache aggressively — wilayah codes/names are essentially static.
      next: { revalidate: 86400 },
    })
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: upstream.status },
      )
    }
    const body = await upstream.text()
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=86400, s-maxage=86400",
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "wilayah proxy failed" },
      { status: 502 },
    )
  }
}
