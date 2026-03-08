"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  StickyNote,
  CheckSquare,
  BookOpen,
  FolderKanban,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAppStore } from "@/stores/app-store";

export function SearchCommand() {
  const router = useRouter();
  const searchOpen = useAppStore((state) => state.searchOpen);
  const setSearchOpen = useAppStore((state) => state.setSearchOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  const handleSelect = (href: string) => {
    setSearchOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
      <CommandInput placeholder="Search across everything..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Notes">
          <CommandItem onSelect={() => handleSelect("/notes")}>
            <StickyNote />
            <span>Search Notes...</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="To-Dos">
          <CommandItem onSelect={() => handleSelect("/todos")}>
            <CheckSquare />
            <span>Search To-Dos...</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Journal">
          <CommandItem onSelect={() => handleSelect("/journal")}>
            <BookOpen />
            <span>Search Journal Entries...</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Projects">
          <CommandItem onSelect={() => handleSelect("/projects")}>
            <FolderKanban />
            <span>Search Projects...</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
