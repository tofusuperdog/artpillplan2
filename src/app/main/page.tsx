import AppClient from "@/components/app/AppClient";
import { hasSessionCookie } from "@/lib/serverAuth";
import { getAppData } from "@/lib/serverAppData";
import { redirect } from "next/navigation";

export default async function MainPage() {
  if (!(await hasSessionCookie())) redirect("/");
  try {
    // Render the stock screen from the current snapshot. Daily consumption is
    // reconciled by the client after the screen is visible, so navigation from
    // the module launcher is never held up by a potentially long sync.
    return <AppClient initialData={await getAppData({ syncDailyStock: false })} />;
  } catch (error) {
    return <AppClient initialError={error instanceof Error ? error.message : "Unable to load app data."} />;
  }
}
