"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Settings,
  Timer,
} from "lucide-react";

type TimerMode = "work" | "break";

function playBeep() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);

    // Second beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1000, ctx.currentTime + 0.6);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.6);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.1);
    osc2.start(ctx.currentTime + 0.6);
    osc2.stop(ctx.currentTime + 1.1);
  } catch {
    // Web Audio API not available
  }
}

export default function FocusPage() {
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = mode === "work" ? workMinutes * 60 : breakMinutes * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Circle dimensions
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleTimerEnd = useCallback(() => {
    playBeep();
    if (mode === "work") {
      setPomodorosCompleted((p) => p + 1);
      setMode("break");
      setTimeLeft(breakMinutes * 60);
    } else {
      setMode("work");
      setTimeLeft(workMinutes * 60);
    }
    setIsRunning(false);
  }, [mode, breakMinutes, workMinutes]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handleTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, handleTimerEnd]);

  function handleStart() {
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
  }

  function handleReset() {
    setIsRunning(false);
    setMode("work");
    setTimeLeft(workMinutes * 60);
  }

  function switchMode(newMode: TimerMode) {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(
      newMode === "work" ? workMinutes * 60 : breakMinutes * 60
    );
  }

  function handleSettingsSave(newWork: number, newBreak: number) {
    setWorkMinutes(newWork);
    setBreakMinutes(newBreak);
    if (!isRunning) {
      setTimeLeft(mode === "work" ? newWork * 60 : newBreak * 60);
    }
    setShowSettings(false);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Focus Timer</h1>
          <p className="text-sm text-muted-foreground">
            Stay focused with the Pomodoro technique
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="size-4" />
        </Button>
      </div>

      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timer Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsForm
              workMinutes={workMinutes}
              breakMinutes={breakMinutes}
              onSave={handleSettingsSave}
              onCancel={() => setShowSettings(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2 justify-center">
        <Button
          variant={mode === "work" ? "default" : "outline"}
          onClick={() => switchMode("work")}
          disabled={isRunning}
        >
          <Brain className="size-4" data-icon="inline-start" />
          Work
        </Button>
        <Button
          variant={mode === "break" ? "default" : "outline"}
          onClick={() => switchMode("break")}
          disabled={isRunning}
        >
          <Coffee className="size-4" data-icon="inline-start" />
          Break
        </Button>
      </div>

      {/* Timer Circle */}
      <div className="flex justify-center">
        <div className="relative">
          <svg
            width="280"
            height="280"
            viewBox="0 0 280 280"
            className="rotate-[-90deg]"
          >
            {/* Background circle */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            {/* Progress circle */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke={mode === "work" ? "#3b82f6" : "#22c55e"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold tabular-nums">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </span>
            <span className="text-sm text-muted-foreground mt-1 capitalize">
              {mode === "work" ? "Focus Time" : "Break Time"}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {!isRunning ? (
          <Button size="lg" onClick={handleStart}>
            <Play className="size-5" data-icon="inline-start" />
            Start
          </Button>
        ) : (
          <Button size="lg" variant="secondary" onClick={handlePause}>
            <Pause className="size-5" data-icon="inline-start" />
            Pause
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={handleReset}>
          <RotateCcw className="size-5" data-icon="inline-start" />
          Reset
        </Button>
      </div>

      {/* Session Counter */}
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-4">
          <Timer className="size-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Pomodoros completed today:
          </span>
          <span className="text-2xl font-bold">{pomodorosCompleted}</span>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsForm({
  workMinutes,
  breakMinutes,
  onSave,
  onCancel,
}: {
  workMinutes: number;
  breakMinutes: number;
  onSave: (work: number, brk: number) => void;
  onCancel: () => void;
}) {
  const [work, setWork] = useState(String(workMinutes));
  const [brk, setBrk] = useState(String(breakMinutes));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = Math.max(1, Math.min(120, parseInt(work) || 25));
    const b = Math.max(1, Math.min(60, parseInt(brk) || 5));
    onSave(w, b);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="work-duration">Work (minutes)</Label>
          <Input
            id="work-duration"
            type="number"
            min="1"
            max="120"
            value={work}
            onChange={(e) => setWork(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="break-duration">Break (minutes)</Label>
          <Input
            id="break-duration"
            type="number"
            min="1"
            max="60"
            value={brk}
            onChange={(e) => setBrk(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </form>
  );
}
