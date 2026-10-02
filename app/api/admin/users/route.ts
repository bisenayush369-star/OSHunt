import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/app/admin/lib/session";
import { listActivity, listUsers, setBlocked } from "@/app/admin/lib/store";
import { prisma } from "@/components/lib/prisma";

const deny = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

function normalizeUsers(users: Awaited<ReturnType<typeof listUsers>>) {
  return users.map((user) => ({
    ...user,
    githubLogin: user.githubUsername ?? null,
    githubUsername: user.githubUsername ?? null,
  }));
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return deny();

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const activity = await listActivity(id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        githubUsername: true,
        createdAt: true,
      },
    });

    const githubLogin = user?.githubUsername?.trim();
    const github = githubLogin
      ? {
          login: githubLogin,
          avatar: `https://github.com/${githubLogin}.png?size=80`,
          url: `https://github.com/${githubLogin}`,
          followers: 0,
          repos: 0,
          createdAt: user?.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
          events: [],
        }
      : null;

    return NextResponse.json({ activity, github });
  }

  return NextResponse.json({ users: normalizeUsers(await listUsers()) });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return deny();

  const { id, blocked, reason } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || typeof blocked !== "boolean") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const user = await setBlocked(id, blocked, typeof reason === "string" ? reason.slice(0, 200) : undefined);
  return user ? NextResponse.json({ user: { ...user, githubLogin: user.githubUsername ?? null, githubUsername: user.githubUsername ?? null } }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
