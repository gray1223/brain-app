"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"];

export function CreateTravelDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");

  const resetForm = () => {
    setName("");
    setDestination("");
    setStartDate("");
    setEndDate("");
    setBudget("");
    setCurrency("USD");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("travel_plans").insert({
      user_id: user.id,
      name: name.trim(),
      destination: destination.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      budget: budget ? parseFloat(budget) : null,
      currency,
      itinerary: [],
      packing_list: [],
      notes: null,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to create travel plan");
      return;
    }

    toast.success("Travel plan created");
    resetForm();
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Plan a Trip
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Plan a Trip</DialogTitle>
            <DialogDescription>
              Create a new travel plan to organize your adventure.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-name">Trip Name</Label>
              <Input
                id="trip-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer in Paris"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-destination">Destination</Label>
              <Input
                id="trip-destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Paris, France"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trip-start">Start Date</Label>
                <Input
                  id="trip-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trip-end">End Date</Label>
                <Input
                  id="trip-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trip-budget">Budget</Label>
                <Input
                  id="trip-budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={(val) => setCurrency(val ?? "USD")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
