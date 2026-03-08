"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MapPin,
  Calendar as CalendarIcon,
  DollarSign,
  Plus,
  Trash2,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type {
  TravelPlan,
  TravelItineraryDay,
  PackingItem,
} from "@/types/database";

interface TravelDetailProps {
  plan: TravelPlan;
}

export function TravelDetail({ plan: initialPlan }: TravelDetailProps) {
  const [plan, setPlan] = useState<TravelPlan>(initialPlan);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(
    (updates: Partial<TravelPlan>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const supabase = createClient();
        const { error } = await supabase
          .from("travel_plans")
          .update(updates)
          .eq("id", plan.id);
        if (error) {
          toast.error("Failed to save changes");
        }
      }, 800);
    },
    [plan.id]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updatePlan = (updates: Partial<TravelPlan>) => {
    setPlan((prev) => ({ ...prev, ...updates }));
    debouncedSave(updates);
  };

  const totalItineraryCost = plan.itinerary.reduce(
    (sum, day) =>
      sum + day.items.reduce((daySum, item) => daySum + (item.cost ?? 0), 0),
    0
  );

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
        <TabsTrigger value="packing">Packing List</TabsTrigger>
        <TabsTrigger value="budget">Budget</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab plan={plan} updatePlan={updatePlan} />
      </TabsContent>

      <TabsContent value="itinerary">
        <ItineraryTab plan={plan} updatePlan={updatePlan} />
      </TabsContent>

      <TabsContent value="packing">
        <PackingTab plan={plan} updatePlan={updatePlan} />
      </TabsContent>

      <TabsContent value="budget">
        <BudgetTab plan={plan} totalItineraryCost={totalItineraryCost} />
      </TabsContent>
    </Tabs>
  );
}

function OverviewTab({
  plan,
  updatePlan,
}: {
  plan: TravelPlan;
  updatePlan: (u: Partial<TravelPlan>) => void;
}) {
  return (
    <Card className="mt-4 flex flex-col gap-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            Destination
          </Label>
          <Input
            value={plan.destination ?? ""}
            onChange={(e) => updatePlan({ destination: e.target.value || null })}
            placeholder="Where are you going?"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <DollarSign className="size-3.5" />
            Budget ({plan.currency})
          </Label>
          <Input
            type="number"
            value={plan.budget ?? ""}
            onChange={(e) =>
              updatePlan({
                budget: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="Total budget"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <CalendarIcon className="size-3.5" />
            Start Date
          </Label>
          <Input
            type="date"
            value={plan.start_date ?? ""}
            onChange={(e) =>
              updatePlan({ start_date: e.target.value || null })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-1.5">
            <CalendarIcon className="size-3.5" />
            End Date
          </Label>
          <Input
            type="date"
            value={plan.end_date ?? ""}
            onChange={(e) =>
              updatePlan({ end_date: e.target.value || null })
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Notes</Label>
        <Textarea
          value={plan.notes ?? ""}
          onChange={(e) => updatePlan({ notes: e.target.value || null })}
          placeholder="Any notes about your trip..."
          rows={4}
        />
      </div>
    </Card>
  );
}

function ItineraryTab({
  plan,
  updatePlan,
}: {
  plan: TravelPlan;
  updatePlan: (u: Partial<TravelPlan>) => void;
}) {
  const addDay = () => {
    const lastDate =
      plan.itinerary.length > 0
        ? plan.itinerary[plan.itinerary.length - 1].date
        : plan.start_date || new Date().toISOString().split("T")[0];

    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + (plan.itinerary.length > 0 ? 1 : 0));

    const newDay: TravelItineraryDay = {
      date: nextDate.toISOString().split("T")[0],
      items: [],
    };
    updatePlan({ itinerary: [...plan.itinerary, newDay] });
  };

  const removeDay = (dayIndex: number) => {
    const updated = plan.itinerary.filter((_, i) => i !== dayIndex);
    updatePlan({ itinerary: updated });
  };

  const addItem = (dayIndex: number) => {
    const updated = [...plan.itinerary];
    updated[dayIndex] = {
      ...updated[dayIndex],
      items: [
        ...updated[dayIndex].items,
        { time: "09:00", activity: "", location: null, cost: null, notes: null },
      ],
    };
    updatePlan({ itinerary: updated });
  };

  const removeItem = (dayIndex: number, itemIndex: number) => {
    const updated = [...plan.itinerary];
    updated[dayIndex] = {
      ...updated[dayIndex],
      items: updated[dayIndex].items.filter((_, i) => i !== itemIndex),
    };
    updatePlan({ itinerary: updated });
  };

  const updateItem = (
    dayIndex: number,
    itemIndex: number,
    field: string,
    value: string | number | null
  ) => {
    const updated = [...plan.itinerary];
    updated[dayIndex] = {
      ...updated[dayIndex],
      items: updated[dayIndex].items.map((item, i) =>
        i === itemIndex ? { ...item, [field]: value } : item
      ),
    };
    updatePlan({ itinerary: updated });
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      {plan.itinerary.map((day, dayIndex) => (
        <Card key={dayIndex} className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">
              Day {dayIndex + 1} -{" "}
              {format(new Date(day.date + "T12:00:00"), "EEEE, MMM d")}
            </h3>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => removeDay(dayIndex)}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {day.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className="grid grid-cols-[80px_1fr_1fr_80px_auto] gap-2 items-center"
              >
                <Input
                  type="time"
                  value={item.time}
                  onChange={(e) =>
                    updateItem(dayIndex, itemIndex, "time", e.target.value)
                  }
                  className="text-xs"
                />
                <Input
                  value={item.activity}
                  onChange={(e) =>
                    updateItem(dayIndex, itemIndex, "activity", e.target.value)
                  }
                  placeholder="Activity"
                  className="text-xs"
                />
                <Input
                  value={item.location ?? ""}
                  onChange={(e) =>
                    updateItem(
                      dayIndex,
                      itemIndex,
                      "location",
                      e.target.value || null
                    )
                  }
                  placeholder="Location"
                  className="text-xs"
                />
                <Input
                  type="number"
                  value={item.cost ?? ""}
                  onChange={(e) =>
                    updateItem(
                      dayIndex,
                      itemIndex,
                      "cost",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  placeholder="Cost"
                  className="text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeItem(dayIndex, itemIndex)}
                >
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-muted-foreground"
            onClick={() => addItem(dayIndex)}
          >
            <Plus className="size-3.5" />
            Add activity
          </Button>
        </Card>
      ))}

      <Button variant="outline" onClick={addDay}>
        <Plus className="size-4" />
        Add Day
      </Button>
    </div>
  );
}

function PackingTab({
  plan,
  updatePlan,
}: {
  plan: TravelPlan;
  updatePlan: (u: Partial<TravelPlan>) => void;
}) {
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("General");

  const categories = Array.from(
    new Set(plan.packing_list.map((item) => item.category))
  );

  const addItem = () => {
    if (!newItemName.trim()) return;
    const newItem: PackingItem = {
      name: newItemName.trim(),
      packed: false,
      category: newItemCategory,
    };
    updatePlan({ packing_list: [...plan.packing_list, newItem] });
    setNewItemName("");
  };

  const togglePacked = (index: number) => {
    const updated = plan.packing_list.map((item, i) =>
      i === index ? { ...item, packed: !item.packed } : item
    );
    updatePlan({ packing_list: updated });
  };

  const removeItem = (index: number) => {
    const updated = plan.packing_list.filter((_, i) => i !== index);
    updatePlan({ packing_list: updated });
  };

  const packedCount = plan.packing_list.filter((i) => i.packed).length;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <Package className="size-4" />
            Packing List
          </h3>
          <span className="text-sm text-muted-foreground">
            {packedCount} / {plan.packing_list.length} packed
          </span>
        </div>

        <div className="mb-4 flex gap-2">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Item name..."
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <Input
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            placeholder="Category"
            className="w-36"
          />
          <Button onClick={addItem} disabled={!newItemName.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No items yet. Add items to your packing list above.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {categories.map((category) => {
              const items = plan.packing_list
                .map((item, index) => ({ ...item, originalIndex: index }))
                .filter((item) => item.category === category);

              return (
                <div key={category}>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    {category}
                  </h4>
                  <div className="flex flex-col gap-1">
                    {items.map((item) => (
                      <div
                        key={item.originalIndex}
                        className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={item.packed}
                          onCheckedChange={() =>
                            togglePacked(item.originalIndex)
                          }
                        />
                        <span
                          className={`flex-1 text-sm ${
                            item.packed
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {item.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeItem(item.originalIndex)}
                        >
                          <Trash2 className="size-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function BudgetTab({
  plan,
  totalItineraryCost,
}: {
  plan: TravelPlan;
  totalItineraryCost: number;
}) {
  const budget = plan.budget ?? 0;
  const remaining = budget - totalItineraryCost;
  const percentUsed = budget > 0 ? (totalItineraryCost / budget) * 100 : 0;

  const costByDay = plan.itinerary.map((day) => ({
    date: day.date,
    cost: day.items.reduce((sum, item) => sum + (item.cost ?? 0), 0),
  }));

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Budget</p>
          <p className="text-2xl font-semibold">
            {budget.toLocaleString()} {plan.currency}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Planned Spending</p>
          <p className="text-2xl font-semibold">
            {totalItineraryCost.toLocaleString()} {plan.currency}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Remaining</p>
          <p
            className={`text-2xl font-semibold ${
              remaining < 0 ? "text-destructive" : ""
            }`}
          >
            {remaining.toLocaleString()} {plan.currency}
          </p>
        </Card>
      </div>

      {budget > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-sm font-medium">Budget Usage</p>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                percentUsed > 100 ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {percentUsed.toFixed(1)}% used
          </p>
        </Card>
      )}

      {costByDay.length > 0 && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-medium">Daily Breakdown</p>
          <div className="flex flex-col gap-2">
            {costByDay.map((day, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Day {i + 1} -{" "}
                  {format(new Date(day.date + "T12:00:00"), "MMM d")}
                </span>
                <span className="font-medium">
                  {day.cost.toLocaleString()} {plan.currency}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
