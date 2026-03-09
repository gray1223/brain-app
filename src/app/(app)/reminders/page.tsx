import { redirect } from "next/navigation";

export default function RemindersPage() {
  redirect("/todos?tab=reminders");
}
