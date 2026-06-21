import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { getAppData } from "@/lib/serverAppData";

export async function GET(request: Request) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  try {
    return NextResponse.json(await getAppData({ syncDailyStock: searchParams.get("sync") !== "false" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load app data.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
