"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  href?: string;
}

export function WidgetCard({
  title,
  icon: Icon,
  children,
  className,
  href,
}: WidgetCardProps) {
  const header = (
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </CardTitle>
    </CardHeader>
  );

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        className
      )}
    >
      {href ? (
        <Link href={href} className="block hover:opacity-80 transition-opacity">
          {header}
        </Link>
      ) : (
        header
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
