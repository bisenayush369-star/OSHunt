"use server"; // This tells Next.js the entire file is a secure server file

import { signIn } from "@/lib/auth";

export async function loginWithGitHub() {
  await signIn("github", { redirectTo: "/hunt" });
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/hunt" });
}