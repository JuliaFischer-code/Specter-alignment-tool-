import { useEffect, useState } from "react";
import type { MentorEvaluation } from "./idea-evaluator.functions";

export type { MentorEvaluation };

export interface TeamCheckIn {
  id: string;
  createdAt: string;
  learning: string;
  decision: "continue" | "pause" | "stop";
}

export interface IdeaCard {
  id: string;
  author: string;
  problem: string;
  whoHasIt: string;
  experiment: string;
  willingToRisk: string;
  goSignal: string;
  stopSignal: string;
  status: string;
  checkIns: TeamCheckIn[];
  createdAt: string;
  mentorEvaluation?: MentorEvaluation;
}

export interface PendingIdea {
  problem: string;
  whoHasIt: string;
  experiment: string;
  willingToRisk: string;
  goSignal: string;
  stopSignal: string;
}

export const blankPendingIdea: PendingIdea = {
  problem: "",
  whoHasIt: "",
  experiment: "",
  willingToRisk: "",
  goSignal: "",
  stopSignal: "",
};

const PENDING_KEY = "uncertainty-navigator/team-pending-v1";
const PENDING_EVAL_KEY = "uncertainty-navigator/team-pending-eval-v1";
const IDEAS_KEY = "uncertainty-navigator/team-ideas-v1";
const SEEDED_KEY = "uncertainty-navigator/team-seeded-v2";

export const MOCK_IDEAS: IdeaCard[] = [
  {
    id: "mock-1",
    author: "Lena K., Backend Engineer",
    problem: "Our on-call rotation burns people out because alerts are mostly noise",
    whoHasIt: "On-call engineers",
    experiment:
      "Build a simple ML filter that suppresses alerts with >90% false-positive rate for one week",
    willingToRisk: "5 hours of my own time",
    goSignal: "On-call engineer reports fewer than 10 wake-ups in a week vs current 30+",
    stopSignal: "Any missed real incident due to suppression",
    status: "Active · Week 2",
    checkIns: [
      {
        id: "mock-1-ci-1",
        createdAt: "2026-05-17T09:00:00Z",
        learning:
          "False-positive rate is actually 94% — higher than expected. Filter is working but needs tuning on severity thresholds.",
        decision: "continue",
      },
      {
        id: "mock-1-ci-2",
        createdAt: "2026-05-24T10:00:00Z",
        learning:
          "Wake-ups dropped to 18 this week. Still above target but trend is strong. Team morale visibly better.",
        decision: "continue",
      },
    ],
    createdAt: "2026-05-10T08:00:00Z",
    mentorEvaluation: {
      verdict: "pursue",
      verdictReason: "Real pain, testable in a week, clear stop signal.",
      problemStrength: "strong",
      experimentQuality: "sharp",
      biggestBlindspot:
        "Suppression logic may hide cascading failures that look like noise at first.",
      mentorNote: "This is the right shape of experiment. You've named the risk. Run it.",
    },
  },
];

function loadIdeas(): IdeaCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(IDEAS_KEY);
    return raw ? (JSON.parse(raw) as IdeaCard[]) : [];
  } catch {
    return [];
  }
}

function saveIdeas(ideas: IdeaCard[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IDEAS_KEY, JSON.stringify(ideas));
}

export function useIdeas() {
  const [ideas, setIdeas] = useState<IdeaCard[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seeded = window.localStorage.getItem(SEEDED_KEY);
    if (!seeded) {
      saveIdeas(MOCK_IDEAS);
      window.localStorage.setItem(SEEDED_KEY, "1");
      setIdeas(MOCK_IDEAS);
    } else {
      setIdeas(loadIdeas());
    }
    setHydrated(true);
  }, []);

  const add = (idea: IdeaCard) => {
    setIdeas((prev) => {
      const next = [...prev, idea];
      saveIdeas(next);
      return next;
    });
  };

  const addCheckIn = (ideaId: string, checkIn: TeamCheckIn, newStatus: string) => {
    setIdeas((prev) => {
      const next = prev.map((idea) => {
        if (idea.id !== ideaId) return idea;
        return {
          ...idea,
          status: newStatus,
          checkIns: [...idea.checkIns, checkIn],
        };
      });
      saveIdeas(next);
      return next;
    });
  };

  return { ideas, hydrated, add, addCheckIn };
}

export function savePendingIdea(data: PendingIdea) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(data));
  window.localStorage.removeItem(PENDING_EVAL_KEY);
}

export function loadPendingIdea(): PendingIdea | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingIdea) : null;
  } catch {
    return null;
  }
}

export function savePendingEvaluation(eval_: MentorEvaluation) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_EVAL_KEY, JSON.stringify(eval_));
}

export function loadPendingEvaluation(): MentorEvaluation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_EVAL_KEY);
    return raw ? (JSON.parse(raw) as MentorEvaluation) : null;
  } catch {
    return null;
  }
}

export function usePendingIdea() {
  const [data, setData] = useState<PendingIdea | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setData(loadPendingIdea());
    setHydrated(true);
  }, []);
  const update = (next: PendingIdea) => {
    setData(next);
    savePendingIdea(next);
  };
  return { data, update, hydrated };
}

export function getStatusColor(status: string): string {
  const lower = status.toLowerCase();
  if (lower.startsWith("watch")) return "text-amber-600";
  if (lower.startsWith("stop")) return "text-destructive";
  return "text-primary";
}

export function getStatusDotColor(status: string): string {
  const lower = status.toLowerCase();
  if (lower.startsWith("watch")) return "bg-amber-500";
  if (lower.startsWith("stop")) return "bg-destructive";
  return "bg-primary";
}

export function getNewStatus(
  decision: TeamCheckIn["decision"],
  createdAt: string,
): string {
  const week = Math.max(
    1,
    Math.ceil(
      (Date.now() - new Date(createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000),
    ),
  );
  if (decision === "stop") return "Stopped";
  if (decision === "pause") return `Watch · Week ${week}`;
  return `On track · Week ${week}`;
}
