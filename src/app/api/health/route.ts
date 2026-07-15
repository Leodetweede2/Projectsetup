import { NextResponse } from "next/server";

// Never cache — this is a liveness probe used by Fly.io's health check.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}
