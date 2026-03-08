"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MoodDashboard } from "@/components/insights/mood-dashboard";
import { ActivityHeatmap } from "@/components/insights/activity-heatmap";
import { TagCloud } from "@/components/insights/tag-cloud";
import { Heart, Activity, Tag } from "lucide-react";

interface InsightsTabsProps {
  moodData: { date: string; mood: number | null; tags: string[] }[];
  activityData: { date: string; type: string; count: number }[];
  tagData: { name: string; count: number }[];
}

export function InsightsTabs({
  moodData,
  activityData,
  tagData,
}: InsightsTabsProps) {
  return (
    <Tabs defaultValue="mood">
      <TabsList>
        <TabsTrigger value="mood">
          <Heart className="size-4" />
          Mood
        </TabsTrigger>
        <TabsTrigger value="activity">
          <Activity className="size-4" />
          Activity
        </TabsTrigger>
        <TabsTrigger value="tags">
          <Tag className="size-4" />
          Tags
        </TabsTrigger>
      </TabsList>

      <TabsContent value="mood">
        <MoodDashboard journalEntries={moodData} />
      </TabsContent>

      <TabsContent value="activity">
        <ActivityHeatmap activities={activityData} />
      </TabsContent>

      <TabsContent value="tags">
        <TagCloud tags={tagData} />
      </TabsContent>
    </Tabs>
  );
}
