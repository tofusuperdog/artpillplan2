import { NextResponse } from "next/server";
import { getBloodPressureData } from "@/lib/bloodPressure";
import { hasSessionCookie } from "@/lib/serverAuth";

export async function GET() {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getBloodPressureData());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load blood pressure data.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
