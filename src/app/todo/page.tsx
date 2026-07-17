import TodoClient from "@/components/app/TodoClient";
import { hasSessionCookie } from "@/lib/serverAuth";
import { redirect } from "next/navigation";

export default async function TodoPage() {
  if (!(await hasSessionCookie())) redirect("/");
  return <TodoClient />;
}
