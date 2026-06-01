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
const SEEDED_KEY = "uncertainty-navigator/team-seeded-v4";

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
  {
    id: "mock-2",
    author: "Jonas W., Site Reliability Engineer",
    problem: "Our monitoring dashboards have so many metrics that engineers ignore them entirely",
    whoHasIt: "SRE team",
    experiment:
      "Hide all metrics below a relevance threshold for one week and see if incident response improves",
    willingToRisk: "Risk of missing a metric that matters — I'll stay on-call myself that week",
    goSignal: "Mean time to detect incidents drops by 30%",
    stopSignal: "Any incident where a hidden metric was the first signal",
    status: "On track · Week 1",
    checkIns: [
      {
        id: "mock-2-ci-1",
        createdAt: "2026-05-24T09:00:00Z",
        learning:
          "Engineers are already commenting that dashboards feel less overwhelming. No incidents yet this week.",
        decision: "continue",
      },
    ],
    createdAt: "2026-05-17T08:00:00Z",
    mentorEvaluation: {
      verdict: "pursue",
      verdictReason: "Strong signal problem with clear metrics.",
      problemStrength: "strong",
      experimentQuality: "sharp",
      biggestBlindspot: "Relevance thresholds may be miscalibrated for rare but critical events.",
      mentorNote: "Bold call to hide metrics. The stop signal is unambiguous. Run it.",
    },
  },
  {
    id: "mock-3",
    author: "Priya S., Frontend Engineer",
    problem:
      "Design handoffs create a week of back-and-forth between design and engineering on every feature",
    whoHasIt: "Frontend engineers and designers",
    experiment: "Use an AI tool to auto-generate component specs from Figma files for one sprint",
    willingToRisk: "One sprint's worth of slower delivery if it doesn't work",
    goSignal: "Handoff time drops from 5 days to 1 day",
    stopSignal: "Engineers spend more time fixing AI output than reading design files",
    status: "Watch · Week 3",
    checkIns: [
      {
        id: "mock-3-ci-1",
        createdAt: "2026-05-10T09:00:00Z",
        learning:
          "AI-generated specs are 60% accurate. Still requires significant manual correction.",
        decision: "continue",
      },
      {
        id: "mock-3-ci-2",
        createdAt: "2026-05-17T09:00:00Z",
        learning:
          "Accuracy improved to 70% after prompt tuning but engineers spending 3+ hours fixing output.",
        decision: "pause",
      },
      {
        id: "mock-3-ci-3",
        createdAt: "2026-05-24T09:00:00Z",
        learning:
          "Paused to rethink approach. The tool works better for simple components than complex ones.",
        decision: "pause",
      },
    ],
    createdAt: "2026-05-03T08:00:00Z",
    mentorEvaluation: {
      verdict: "pause",
      verdictReason: "Problem is real but experiment needs sharper scope.",
      problemStrength: "strong",
      experimentQuality: "vague",
      biggestBlindspot:
        "AI accuracy varies widely by component complexity — one sprint may not reveal the full picture.",
      mentorNote: "Narrow the experiment to a specific component type before drawing conclusions.",
    },
  },
  {
    id: "mock-4",
    author: "Tom R., Data Engineer",
    problem:
      "Data pipeline failures are only discovered by downstream teams hours after they happen",
    whoHasIt: "Data consumers across the org",
    experiment:
      "Add a simple anomaly detector that pings the data team Slack channel immediately on failure",
    willingToRisk: "A weekend to build it",
    goSignal: "Detection time drops from 4 hours to under 10 minutes",
    stopSignal: "More than 5 false positive alerts per day",
    status: "On track · Week 2",
    checkIns: [
      {
        id: "mock-4-ci-1",
        createdAt: "2026-05-17T09:00:00Z",
        learning:
          "Detector built and deployed. Two real failures caught within 8 minutes each. Zero false positives so far.",
        decision: "continue",
      },
      {
        id: "mock-4-ci-2",
        createdAt: "2026-05-24T09:00:00Z",
        learning:
          "Detection time averaging 6 minutes. One false positive triggered by a planned maintenance window.",
        decision: "continue",
      },
    ],
    createdAt: "2026-05-10T08:00:00Z",
    mentorEvaluation: {
      verdict: "pursue",
      verdictReason: "Fast feedback loop with measurable outcome.",
      problemStrength: "strong",
      experimentQuality: "sharp",
      biggestBlindspot:
        "Slack pings can get ignored in noisy channels — consider a dedicated alert channel.",
      mentorNote: "This is a weekend build that could save hours weekly. Strong ROI. Keep going.",
    },
  },
  {
    id: "mock-5",
    author: "Anna L., Mobile Engineer",
    problem:
      "App crash reports are so verbose that engineers spend 2 hours triaging before finding the root cause",
    whoHasIt: "Mobile engineers on call",
    experiment:
      "Use an LLM to summarize crash reports into 3-line root cause hypotheses for one week",
    willingToRisk: "My evenings this week",
    goSignal: "Triage time drops from 2 hours to under 20 minutes",
    stopSignal: "LLM summary is wrong on more than 30% of crashes",
    status: "On track · Week 1",
    checkIns: [
      {
        id: "mock-5-ci-1",
        createdAt: "2026-05-24T09:00:00Z",
        learning:
          "LLM summaries are surprisingly accurate. 4 out of 5 crashes summarized correctly. Triage time down to 35 minutes average.",
        decision: "continue",
      },
    ],
    createdAt: "2026-05-17T08:00:00Z",
    mentorEvaluation: {
      verdict: "pursue",
      verdictReason: "High leverage if accuracy holds.",
      problemStrength: "strong",
      experimentQuality: "sharp",
      biggestBlindspot: "LLM may hallucinate for novel crash patterns it hasn't seen before.",
      mentorNote:
        "Track accuracy rigorously. If you hit 80%+ correct summaries, this is worth productizing.",
    },
  },
  {
    id: "mock-6",
    author: "Maya P., Platform Engineer",
    problem:
      "Release notes are manually rewritten three times before customer-facing teams can use them",
    whoHasIt: "Developer relations and customer success",
    experiment:
      "Use an LLM to turn merged pull requests into draft customer-facing release notes for one week",
    willingToRisk: "Two afternoons and one customer-success review cycle",
    goSignal: "80% of generated notes need only light edits before publishing",
    stopSignal: "Any generated note claims a feature shipped when it did not",
    status: "Stopped · Week 2",
    checkIns: [
      {
        id: "mock-6-ci-1",
        createdAt: "2026-05-17T09:00:00Z",
        learning:
          "Drafts were fast, but three notes overstated unreleased feature flags. Customer success had to manually verify every line.",
        decision: "pause",
      },
      {
        id: "mock-6-ci-2",
        createdAt: "2026-05-24T09:00:00Z",
        learning:
          "A generated note claimed a feature was live for all customers when it was only enabled in staging. Stop signal triggered.",
        decision: "stop",
      },
    ],
    createdAt: "2026-05-10T08:00:00Z",
    mentorEvaluation: {
      verdict: "drop",
      verdictReason: "The stop signal was triggered and the review cost erased the speed benefit.",
      problemStrength: "strong",
      experimentQuality: "sharp",
      biggestBlindspot:
        "Release-state truth needs deterministic source data before an LLM can safely summarize it.",
      mentorNote:
        "Stop this version. Revisit only after feature-flag state is wired into the source material.",
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

export function getNewStatus(decision: TeamCheckIn["decision"], createdAt: string): string {
  const week = Math.max(
    1,
    Math.ceil((Date.now() - new Date(createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)),
  );
  if (decision === "stop") return "Stopped";
  if (decision === "pause") return `Watch · Week ${week}`;
  return `On track · Week ${week}`;
}
