import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/roster/validate";
import { readBoundedJson } from "@/lib/http/read-bounded-json";
import { getOtp, deleteOtp, incrementOtpAttempts } from "@/lib/auth/otp-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await readBoundedJson(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const body = parsed.value as { email?: unknown; code?: unknown } | null;
  const rawEmail = typeof body?.email === "string" ? body.email.trim() : "";
  const email = normalizeEmail(rawEmail);
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!email || !code) {
    return NextResponse.json(
      { error: "Provide both institutional email and 6-digit verification code." },
      { status: 400 }
    );
  }

  const stored = getOtp(email);
  if (!stored) {
    return NextResponse.json(
      { error: "Verification code expired or not found. Please request a new code." },
      { status: 400 }
    );
  }

  if (stored.code !== code) {
    const attempts = incrementOtpAttempts(email);
    if (attempts >= 5) {
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new verification code." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: `Incorrect verification code. ${5 - attempts} attempts remaining.` },
      { status: 400 }
    );
  }

  // Code matches! Clear the one-time code
  deleteOtp(email);

  // Derive identity
  const prefix = email.split("@")[0] || "";
  const isLikelyRoll = /^\d{5,8}$/i.test(prefix) || /^[0-9]{6}$/.test(prefix);

  const role = stored.role;
  const rollNumber = isLikelyRoll ? prefix.toUpperCase() : role === "lecturer" ? "FAC-01" : "261161";
  const name =
    role === "lecturer"
      ? "Dr. Faculty Member"
      : prefix
          .replace(/[._\d]/g, " ")
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase()) || "Alex Doe";

  const redirectUrl = role === "lecturer" ? "/lecturer" : "/dashboard";

  return NextResponse.json({
    ok: true,
    user: {
      uid: `user-${prefix}`,
      email,
      role,
      rollNumber,
      name,
      verifiedAt: new Date().toISOString(),
    },
    redirectUrl,
  });
}
