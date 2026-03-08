"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function CreateNoteButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: "Untitled",
          content: null,
          tags: [],
          is_archived: false,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (data) {
        router.push(`/notes/${data.id}`);
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleCreate} disabled={loading}>
      <Plus data-icon="inline-start" />
      {loading ? "Creating..." : "New Note"}
    </Button>
  );
}
