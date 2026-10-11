import crypto from "crypto";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { prisma } from "@/components/lib/prisma";

function createResetCode() {
  return crypto.randomInt(100000, 1000000).toString().padStart(6, "0");
}

async function sendResetCodeEmail(email: string, code: string) {
  const fromAddress = process.env.ALERT_EMAIL_USER;
  const password = process.env.ALERT_EMAIL_PASS;

  if (!fromAddress || !password) {
    throw new Error("Missing Gmail SMTP environment variables: ALERT_EMAIL_USER / ALERT_EMAIL_PASS");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: fromAddress,
      pass: password,
    },
  });

  await transporter.sendMail({
    from: `"OSHunt Security" <${fromAddress}>`,
    to: email,
    subject: "Your OSHunt password reset code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #111827; color: #f9fafb;">
        <h2 style="margin: 0 0 12px; color: #a8ff3e;">Password reset request</h2>
        <p style="margin: 0 0 16px; color: #d1d5db;">Use the code below to verify your account and set a new password.</p>
        <div style="padding: 18px 20px; border-radius: 10px; background: #1f2937; text-align: center; letter-spacing: 4px; font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 16px;">${code}</div>
        <p style="margin: 0; color: #9ca3af; font-size: 14px;">This code expires in 15 minutes.</p>
      </div>
    `,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists for that email, a verification code has been sent.",
      });
    }

    const code = createResetCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: code,
        expires,
      },
    });

    await sendResetCodeEmail(email, code);

    return NextResponse.json({
      success: true,
      message: "A 6-digit verification code was sent to your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Unable to send the reset code right now." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST to send a reset code." }, { status: 405 });
}
