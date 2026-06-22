import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  })
  return NextResponse.json(bookmarks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const bookmark = await prisma.bookmark.upsert({
    where: { userId_url: { userId: session.user.id, url: body.url } },
    create: { userId: session.user.id, ...body },
    update: {}
  })
  return NextResponse.json(bookmark)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { url } = await req.json()
  await prisma.bookmark.deleteMany({
    where: { userId: session.user.id, url }
  })
  return NextResponse.json({ success: true })
}