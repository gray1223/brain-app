"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Upload, FileText, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ParsedCard {
  front: string;
  back: string;
  selected: boolean;
}

interface Deck {
  id: string;
  name: string;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}

function detectDelimiter(text: string): string {
  const firstLines = text.split("\n").slice(0, 5);
  let tabCount = 0;
  let commaCount = 0;

  for (const line of firstLines) {
    tabCount += (line.match(/\t/g) || []).length;
    commaCount += (line.match(/,/g) || []).length;
  }

  return tabCount >= commaCount ? "\t" : ",";
}

function parseFile(text: string): ParsedCard[] {
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const cards: ParsedCard[] = [];

  for (const line of lines) {
    const fields = parseCSVLine(line, delimiter);

    if (fields.length >= 2) {
      const front = fields[0].trim();
      const back = fields[1].trim();

      if (front && back) {
        cards.push({ front, back, selected: true });
      }
    }
  }

  return cards;
}

export function ImportFlashcards({ decks }: { decks: Deck[] }) {
  const [cards, setCards] = useState<ParsedCard[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [newDeckName, setNewDeckName] = useState("");
  const [createNewDeck, setCreateNewDeck] = useState(decks.length === 0);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFile = useCallback((file: File) => {
    const validExtensions = [".csv", ".tsv", ".txt"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(ext)) {
      toast.error("Please upload a .csv, .tsv, or .txt file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseFile(text);

      if (parsed.length === 0) {
        toast.error(
          "No valid cards found. Ensure each row has at least two columns (front and back)."
        );
        return;
      }

      setCards(parsed);
      setFileName(file.name);
      toast.success(`Parsed ${parsed.length} cards from ${file.name}`);
    };
    reader.readAsText(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (e.target) e.target.value = "";
  }

  function toggleCard(index: number) {
    setCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, selected: !card.selected } : card
      )
    );
  }

  function selectAll() {
    setCards((prev) => prev.map((card) => ({ ...card, selected: true })));
  }

  function deselectAll() {
    setCards((prev) => prev.map((card) => ({ ...card, selected: false })));
  }

  function clearFile() {
    setCards([]);
    setFileName(null);
  }

  const selectedCount = cards.filter((c) => c.selected).length;

  async function handleImport() {
    const selectedCards = cards.filter((c) => c.selected);

    if (selectedCards.length === 0) {
      toast.error("No cards selected");
      return;
    }

    if (createNewDeck && !newDeckName.trim()) {
      toast.error("Please enter a deck name");
      return;
    }

    if (!createNewDeck && !deckId) {
      toast.error("Please select a deck");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      toast.error("Not authenticated");
      return;
    }

    let targetDeckId = deckId;

    if (createNewDeck) {
      const { data: newDeck, error: deckError } = await supabase
        .from("flashcard_decks")
        .insert({
          user_id: user.id,
          name: newDeckName.trim(),
        })
        .select("id")
        .single();

      if (deckError || !newDeck) {
        setSaving(false);
        toast.error("Failed to create deck");
        return;
      }

      targetDeckId = newDeck.id;
    }

    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("flashcards").insert(
      selectedCards.map((card) => ({
        user_id: user.id,
        deck_id: targetDeckId,
        front: card.front,
        back: card.back,
        ease_factor: 2.5,
        interval_days: 0,
        next_review: today,
        review_count: 0,
      }))
    );

    setSaving(false);

    if (error) {
      toast.error("Failed to import cards");
      return;
    }

    toast.success(`Imported ${selectedCards.length} cards`);
    router.push(`/flashcards/${targetDeckId}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* File drop zone */}
      {cards.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <Upload className="mb-3 size-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop a file here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports .csv, .tsv, and .txt files
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            First column = front, second column = back
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      ) : (
        <>
          {/* File info bar */}
          <Card className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName}</span>
              <span className="text-xs text-muted-foreground">
                ({cards.length} card{cards.length !== 1 ? "s" : ""})
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFile}>
              <X className="size-4" />
            </Button>
          </Card>

          {/* Deck selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Destination Deck</Label>

            {decks.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCreateNewDeck(false)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    !createNewDeck
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Existing deck
                </button>
                <button
                  type="button"
                  onClick={() => setCreateNewDeck(true)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    createNewDeck
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  New deck
                </button>
              </div>
            )}

            {createNewDeck ? (
              <Input
                placeholder="Enter deck name..."
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
              />
            ) : (
              <Select
                value={deckId}
                onValueChange={(val) => setDeckId(val ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a deck" />
                </SelectTrigger>
                <SelectContent>
                  {decks.map((deck) => (
                    <SelectItem key={deck.id} value={deck.id}>
                      {deck.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Preview table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Preview ({selectedCount} of {cards.length} selected)
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  disabled={selectedCount === cards.length}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  disabled={selectedCount === 0}
                >
                  Deselect all
                </Button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="border-b">
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Front
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Back
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card, index) => (
                    <tr
                      key={index}
                      className={`border-b last:border-0 transition-colors ${
                        card.selected
                          ? "bg-background"
                          : "bg-muted/30 opacity-50"
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <Checkbox
                          checked={card.selected}
                          onCheckedChange={() => toggleCard(index)}
                        />
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2">
                        {card.front}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2">
                        {card.back}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleImport}
            disabled={saving || selectedCount === 0}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                Importing...
              </>
            ) : (
              <>
                <Check className="size-4" data-icon="inline-start" />
                Import {selectedCount} Card{selectedCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
