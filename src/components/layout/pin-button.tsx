"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Pin } from "lucide-react";
import { toast } from "sonner";

interface PinButtonProps {
  table: string;
  itemId: string;
  isPinned: boolean;
}

export function PinButton({ table, itemId, isPinned }: PinButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [pinned, setPinned] = useState(isPinned);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const newValue = !pinned;

    const { error } = await supabase
      .from(table)
      .update({ is_pinned: newValue })
      .eq("id", itemId);

    setLoading(false);

    if (error) {
      toast.error("Failed to update pin status");
      return;
    }

    setPinned(newValue);
    toast.success(newValue ? "Pinned" : "Unpinned");
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="size-8 p-0"
      title={pinned ? "Unpin" : "Pin"}
      aria-label={pinned ? "Unpin item" : "Pin item"}
    >
      <Pin
        className={`size-4 ${
          pinned
            ? "fill-current text-primary"
            : "text-muted-foreground"
        }`}
      />
    </Button>
  );
}
