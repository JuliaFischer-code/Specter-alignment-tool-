import { useEffect, useState } from "react";

export interface CheckInEntry {
  id: string;
  createdAt: string;
  verdict: "on-track" | "watch" | "breach";
  scores: Record<string, "on-track" | "watch" | "breach">;
  currentValues: Record<string, string>;
  notes: Record<string, string>;
}

const CHECKINS_KEY = "uncertainty-navigator/check-ins-v1";

export function useCheckIns() {
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CHECKINS_KEY);
      if (raw) setCheckIns(JSON.parse(raw) as CheckInEntry[]);
    } catch {}
  }, []);

  const add = (entry: CheckInEntry) => {
    setCheckIns((prev) => {
      const next = [...prev, entry];
      window.localStorage.setItem(CHECKINS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { checkIns, add };
}

export interface CommitmentData {
  pilotName: string;
  sponsor: string;
  hypothesis: string;
  budgetCeiling: string;
  timeBox: string;
  reputationalRisk: string;
  opportunityCost: string;
  killCriteria: string;
  successSignals: string;
  createdAt: string;
}

const KEY = "uncertainty-navigator/commitment-v1";

export const blankCommitment: CommitmentData = {
  pilotName: "",
  sponsor: "",
  hypothesis: "",
  budgetCeiling: "",
  timeBox: "",
  reputationalRisk: "",
  opportunityCost: "",
  killCriteria: "",
  successSignals: "",
  createdAt: "",
};

export const sampleCommitment: CommitmentData = {
  pilotName: "Claims Triage Copilot",
  sponsor: "M. Andersen, COO Insurance",
  hypothesis:
    "An LLM-assisted triage layer can reduce first-touch handling time on Tier-2 claims by 30% without increasing leakage.",
  budgetCeiling: "$220,000 — fully loaded, including vendor + 1.5 FTE",
  timeBox: "12 weeks from kickoff to go / no-go",
  reputationalRisk:
    "Internal only. No customer-visible decisions during the pilot window.",
  opportunityCost:
    "Defers the legacy rules-engine migration by one quarter; team consents.",
  killCriteria:
    "Stop if (a) handling time reduction < 10% at week 8, or (b) any single hallucinated payout recommendation reaches an adjuster.",
  successSignals:
    "≥25% reduction in handling time, adjuster CSAT ≥ baseline, zero unsafe recommendations escalated.",
  createdAt: new Date().toISOString(),
};

export function loadCommitment(): CommitmentData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CommitmentData;
  } catch {
    return null;
  }
}

export function saveCommitment(data: CommitmentData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export function useCommitment() {
  const [data, setData] = useState<CommitmentData | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setData(loadCommitment());
    setHydrated(true);
  }, []);
  const update = (next: CommitmentData) => {
    setData(next);
    saveCommitment(next);
  };
  return { data, update, hydrated };
}

export const promptScript: {
  id: keyof Omit<CommitmentData, "createdAt">;
  question: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    id: "pilotName",
    question: "What are we calling this pilot?",
    hint: "A working name your steering committee will recognize in six weeks.",
    placeholder: "e.g. Claims Triage Copilot",
  },
  {
    id: "sponsor",
    question: "Who is the accountable sponsor?",
    hint: "One named executive who owns the go / no-go decision.",
    placeholder: "Name, role, business unit",
  },
  {
    id: "hypothesis",
    question: "What do you believe AI will change here?",
    hint: "State it as a falsifiable hypothesis, not an ambition.",
    placeholder: "We believe that … which will result in … measured by …",
  },
  {
    id: "budgetCeiling",
    question: "What is the most you can afford to lose?",
    hint: "Fully-loaded ceiling. The pilot stops here, no exceptions.",
    placeholder: "$ amount + what it includes",
  },
  {
    id: "timeBox",
    question: "How long before you walk away?",
    hint: "An absolute date — not a milestone you'll renegotiate.",
    placeholder: "e.g. 12 weeks from kickoff",
  },
  {
    id: "reputationalRisk",
    question: "What is the reputational exposure?",
    hint: "Who sees the output, and what happens if it's wrong in public.",
    placeholder: "Internal only, customer-facing, regulated, etc.",
  },
  {
    id: "opportunityCost",
    question: "What are you choosing not to do?",
    hint: "Name the work this pilot displaces. The team should agree.",
    placeholder: "Project / initiative + impact of deferral",
  },
  {
    id: "killCriteria",
    question: "What would make you stop early?",
    hint: "At least two signals. Written now, before you're attached.",
    placeholder: "Stop if (a) … or (b) …",
  },
  {
    id: "successSignals",
    question: "What does 'worth continuing' look like?",
    hint: "The threshold for moving past pilot — also written down now.",
    placeholder: "Quantitative + qualitative signals",
  },
];