import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(bookmarks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { url, title, repoName, type } = body ?? {}

  if (!url || !title || !repoName || !type) {
    return NextResponse.json({ error: "Missing required fields: url, title, repoName, type" }, { status: 400 })
  }
  if (type !== "issue" && type !== "repo") {
    return NextResponse.json({ error: "type must be 'issue' or 'repo'" }, { status: 400 })
  }

  // Explicit field mapping — never spread the raw client body into `create`.
  // The old `{ userId: session.user.id, ...body }` let a client-supplied
  // `userId` in the request body silently override the session's, which
  // meant anyone could POST a `userId` and create bookmarks under a
  // different account.
  const bookmark = await prisma.bookmark.upsert({
    where: { userId_url: { userId: session.user.id, url } },
    create: { userId: session.user.id, url, title, repoName, type },
    update: {},
  })
  return NextResponse.json(bookmark)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const urls: string[] = Array.isArray(body?.urls)
    ? body.urls.filter((u: unknown): u is string => typeof u === "string")
    : typeof body?.url === "string"
      ? [body.url]
      : []

  if (urls.length === 0) {
    return NextResponse.json({ error: "Provide a url or urls[] to delete" }, { status: 400 })
  }

  // Accepts { url } (unchanged, existing callers keep working) or the new
  // { urls: string[] } for the bookmarks page's bulk-delete action.
  const result = await prisma.bookmark.deleteMany({
    where: { userId: session.user.id, url: { in: urls } },
  })
  return NextResponse.json({ success: true, deletedCount: result.count })
}
