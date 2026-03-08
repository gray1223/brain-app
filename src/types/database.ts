export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown> | null;
  tags: string[];
  parent_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteConnection {
  id: string;
  note_a_id: string;
  note_b_id: string;
  label: string | null;
  user_id: string;
  created_at: string;
}

export interface TodoList {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  list_id: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  parent_id: string | null;
  order_index: number;
  recurrence: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  remind_at: string;
  recurrence: string | null;
  is_dismissed: boolean;
  linked_todo_id: string | null;
  linked_note_id: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  content: Record<string, unknown> | null;
  mood: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "planning" | "active" | "paused" | "completed" | "archived";
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: "backlog" | "todo" | "in_progress" | "review" | "done";
  order_index: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  google_event_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string | null;
  synced_at: string | null;
  created_at: string;
}

export interface TravelPlan {
  id: string;
  user_id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  itinerary: TravelItineraryDay[];
  packing_list: PackingItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelItineraryDay {
  date: string;
  items: {
    time: string;
    activity: string;
    location: string | null;
    cost: number | null;
    notes: string | null;
  }[];
}

export interface PackingItem {
  name: string;
  packed: boolean;
  category: string;
}

export interface IdeaNode {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  parent_id: string | null;
  idea_board_id: string;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface IdeaBoard {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
