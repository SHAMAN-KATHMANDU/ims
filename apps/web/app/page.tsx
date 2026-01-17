import { redirect } from "next/navigation";

export default function Page() {
  // Redirect to login - middleware handles auth check
  redirect("/login");
}
