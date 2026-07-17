import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const date = searchParams.get("date");
  const days = searchParams.get("days");
  const latest = searchParams.get("latest");

  if (latest === "true") {
    const { data, error } = await supabaseAdmin
      .from("bp_logs")
      .select("id, measured_at, measurement_round, sys, dia, pulse")
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json(data || null);
  }

  let start: Date;
  let end: Date;

  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ message: "A valid date is required." }, { status: 400 });
    }
    start = new Date(`${date}T00:00:00+07:00`);
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (days === "7" || days === "15" || days === "30") {
    // Include today and the requested number of Bangkok calendar days.
    const today = bangkokDate();
    end = new Date(`${today}T00:00:00+07:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - Number(days));
  } else {
    return NextResponse.json({ message: "A valid date or period is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bp_logs")
    .select("id, measured_at, measurement_round, sys, dia, pulse")
    .gte("measured_at", start.toISOString())
    .lt("measured_at", end.toISOString())
    .order("measured_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

function bangkokDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
