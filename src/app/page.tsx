import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Brain,
  StickyNote,
  CheckSquare,
  Layers,
  BookOpen,
  Lightbulb,
  FolderKanban,
  ArrowRight,
} from "lucide-react";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Brain className="size-4" />
          </div>
          <span className="text-lg font-semibold">BrainSpace</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Your second brain,
          <br />
          <span className="text-primary">all in one place</span>
        </h1>
        <p className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
          Organize notes, manage tasks, study with AI-powered flashcards, and
          capture ideas — everything you need to think clearly and learn faster.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start for free
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium hover:bg-muted"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t bg-muted/30 px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
            Everything you need to stay organized
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: StickyNote,
                title: "Rich Notes",
                desc: "Write and organize notes with a powerful editor. Link ideas together.",
              },
              {
                icon: CheckSquare,
                title: "Smart To-Dos",
                desc: "Manage tasks with priorities, due dates, and an Eisenhower matrix view.",
              },
              {
                icon: Layers,
                title: "AI Flashcards",
                desc: "Generate flashcards from your notes. Study with spaced repetition and AI grading.",
              },
              {
                icon: BookOpen,
                title: "Daily Journal",
                desc: "Reflect daily with guided prompts. Track your mood and growth over time.",
              },
              {
                icon: FolderKanban,
                title: "Project Boards",
                desc: "Kanban boards to plan and track projects from backlog to done.",
              },
              {
                icon: Lightbulb,
                title: "Idea Capture",
                desc: "Never lose a thought. Quick-capture ideas from anywhere, anytime.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-5"
              >
                <feature.icon className="mb-3 size-6 text-primary" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground sm:px-8">
        <p>BrainSpace — built to help you think better.</p>
      </footer>
    </div>
  );
}
