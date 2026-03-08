import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TravelDetail } from "@/components/travel/travel-detail";
import { ArrowLeft, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TravelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: plan } = await supabase
    .from("travel_plans")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!plan) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/travel">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <Plane className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">{plan.name}</h1>
          {plan.destination && (
            <p className="text-sm text-muted-foreground">
              {plan.destination}
            </p>
          )}
        </div>
      </div>

      <TravelDetail plan={plan} />
    </div>
  );
}
