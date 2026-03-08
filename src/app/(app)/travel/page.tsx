import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTravelDialog } from "@/components/travel/create-travel-dialog";
import { Plane, MapPin, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default async function TravelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: plans } = await supabase
    .from("travel_plans")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plane className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Travel Plans</h1>
        </div>
        <CreateTravelDialog />
      </div>

      {(!plans || plans.length === 0) ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Plane className="mb-3 size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No travel plans yet.</p>
          <p className="text-sm text-muted-foreground">
            Plan your next adventure!
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isUpcoming =
              plan.start_date && new Date(plan.start_date) > new Date();
            const isPast =
              plan.end_date && new Date(plan.end_date) < new Date();

            return (
              <Link key={plan.id} href={`/travel/${plan.id}`}>
                <Card className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium leading-tight">{plan.name}</h3>
                    {isPast ? (
                      <Badge variant="secondary">Past</Badge>
                    ) : isUpcoming ? (
                      <Badge variant="default">Upcoming</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </div>

                  {plan.destination && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {plan.destination}
                    </div>
                  )}

                  {plan.start_date && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarIcon className="size-3.5" />
                      {format(new Date(plan.start_date), "MMM d")}
                      {plan.end_date &&
                        ` - ${format(new Date(plan.end_date), "MMM d, yyyy")}`}
                    </div>
                  )}

                  {plan.budget != null && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <DollarSign className="size-3.5" />
                      {plan.budget.toLocaleString()} {plan.currency}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
