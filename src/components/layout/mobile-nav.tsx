"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  StickyNote,
  Layers,
  MoreHorizontal,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const tabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/todos", icon: CheckSquare, label: "Tasks" },
  { href: "/notes", icon: StickyNote, label: "Notes" },
  { href: "/flashcards", icon: Layers, label: "Cards" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
      <div
        className="grid grid-cols-5"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 py-2 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              }`}
            >
              <tab.icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : ""}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-1 py-2 text-muted-foreground active:text-foreground"
        >
          <MoreHorizontal className="size-5" strokeWidth={2} />
          <span className="text-[10px] leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
