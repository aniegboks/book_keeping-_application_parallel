// app/api/debug/env/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const serverEmails = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim());
  const clientEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim());
  
  return NextResponse.json({
    emails: serverEmails,
    clientEmails: clientEmails,
    hasServerEnv: !!process.env.SUPER_ADMIN_EMAILS,
    hasClientEnv: !!process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS,
  });
}