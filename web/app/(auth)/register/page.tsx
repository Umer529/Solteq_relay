import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/login?message=Registration%20is%20by%20invitation%20only.%20Contact%20your%20project%20owner%20or%20admin%20to%20get%20access.");
}
