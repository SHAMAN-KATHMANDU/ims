import { redirect } from "next/navigation";

/**
 * Legacy /login: login is now under /[slug]/login (e.g. /ruby/login).
 * Redirect to root so the user sees the "use your organization link" message.
 */
export default function LoginPage() {
  redirect("/");
}
