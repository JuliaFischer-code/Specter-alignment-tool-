import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useCommitment } from "@/lib/commitment-store";
import { analyzeCheckIn, type CheckInAnalysis } from "@/lib/check-in.functions";

export const Route = createFileRoute("/check-in")({
  head: () => ({
    meta: [
      { title: "Project Check-in — Uncertainty Navigator" },
      {
        name: "description",
        content:
          "Re-score your AI pilot against the original affordable-loss commitment.",
      },
      { property: "og:title", content: "Project Check-in" },
      {
        property: "og:description",
        content:
          "Compare current pilot state to the commitment your team signed at kickoff.",
      },
    ],
  }),
  component: CheckInPage,
});

type Status = "on-track" | "watch" | "breach";

const dimensions: {
  key: "budgetCeiling" | "timeBox" | "reputationalRisk" | "opportunityCost" | "killCriteria";
  label: string;
  question: string;
}[] = [
  {
    key: "budgetCeiling",
    label: "Budget burn vs ceiling",
    question: "How much of the affordable-loss ceiling has been consumed?",
  },
  {
    key: "timeBox",
    label: "Time elapsed vs box",
    question: "How much of the original time-box has elapsed?",
  },
  {
    key: "killCriteria",
    label: "Kill criteria proximity",
    question: "Are any of the documented stop-conditions getting close?",
  },
  {
    key: "reputationalRisk",
    label: "Reputational exposure",
    question: "Has the surface area for reputational risk grown since kickoff?",
  },
  {
    key: "opportunityCost",
    label: "Opportunity cost",
    question: "Is the displaced work still acceptable to the team?",
  },
];

const statusMeta: Record<Status, { label: string; bar: string; dot: string }> = {
  "on-track": {
    label: "On track",
    bar: "bg-primary",
    dot: "bg-primary",
  },
  watch: {
    label: "Watch",
    bar: "bg-yellow-600",
    dot: "bg-yellow-600",
  },
  breach: {
    label: "Breach",
    bar: "bg-destructive",
    dot: "bg-destructive",
  },
};

function CheckInPage() {
  const { data, hydrated } = useCommitment();
  const [scores, setScores] = useState<Record<string, Status>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<CheckInAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAnalysis = useServerFn(analyzeCheckIn);

  const verdict = useMemo<Status>(() => {
    if (analysis) return analysis.overallVerdict;
    const vals = Object.values(scores);
    if (vals.includes("breach")) return "breach";
    if (vals.includes("watch")) return "watch";
    return "on-track";
  }, [scores, analysis]);

  if (!hydrated) return <AppShell><div className="h-screen" /></AppShell>;

  if (!data || !data.createdAt) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1240px] px-8 py-32 text-center">
          <div className="eyebrow">No commitment to check against</div>
          <h1 className="mt-4 font-serif text-[40px]">
            Create a commitment first.
          </h1>
          <Link
            to="/"
            className="mt-8 inline-block bg-primary px-6 py-3 text-[13px] text-primary-foreground hover:opacity-90"
          >
            Begin conversation →
          </Link>
        </div>
      </AppShell>
    );
  }

  const completed = Object.keys(scores).length;
  const total = dimensions.length;

  async function handleAnalyze() {
    if (!data) return;
    setRunning(true);
    setError(null);
    try {
      const result = await runAnalysis({
        data: {
          pilotName: data.pilotName,
          sponsor: data.sponsor,
          hypothesis: data.hypothesis,
          killCriteria: data.killCriteria,
          successSignals: data.successSignals,
          dimensions: dimensions.map((d) => ({
            key: d.key,
            label: d.label,
            original: data[d.key] || "",
            current: current[d.key] || "",
            selfScore: scores[d.key],
            notes: notes[d.key],
          })),
        },
      });
      setAnalysis(result);
      const next: Record<string, Status> = {};
      for (const dim of result.dimensions) next[dim.key] = dim.verdict;
      setScores((prev) => ({ ...prev, ...next }));
    } catch (e: any) {
      setError(e?.message || "Analysis failed");
    } finally {
      setRunning(false);
    }
  }

  const perDimAnalysis = useMemo(() => {
    const map: Record<string, { verdict: Status; driftSummary: string }> = {};
    if (analysis) {
      for (const d of analysis.dimensions) {
        map[d.key] = { verdict: d.verdict, driftSummary: d.driftSummary };
      }
    }
    return map;
  }, [analysis]);

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Screen 03 · Check-in against ${data.pilotName || "pilot"}`}
        title="Are we still inside what we said we could afford to lose?"
        lede="Every check-in compares the live pilot to the commitment document — never to a moving definition of success. Score each dimension, capture context, and let the verdict surface."
      />

      <section className="mx-auto max-w-[1240px] px-8">
        <div className="grid grid-cols-12 gap-10">
          {/* Verdict rail */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="sticky top-8 border border-border bg-card p-8">
              <div className="eyebrow">Live verdict</div>
              <div className="mt-4 flex items-center gap-3">
                <span className={`h-3 w-3 ${statusMeta[verdict].dot}`} />
                <span className="font-serif text-[32px] leading-none">
                  {statusMeta[verdict].label}
                </span>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                {verdict === "breach" &&
                  "At least one dimension has crossed the line you drew at kickoff. Convene the sponsor before continuing."}
                {verdict === "watch" &&
                  "Nothing is breached, but signals are drifting. Bring this to the next steering review."}
                {verdict === "on-track" &&
                  "All scored dimensions remain inside the commitment envelope."}
              </p>

              <div className="mt-8 border-t border-border pt-4">
                <div className="flex items-baseline justify-between text-[12px] text-muted-foreground">
                  <span>Scored</span>
                  <span className="font-mono text-foreground">
                    {completed}/{total}
                  </span>
                </div>
                <div className="mt-2 flex gap-1">
                  {dimensions.map((d) => (
                    <div
                      key={d.key}
                      className={
                        "h-1 flex-1 " +
                        (scores[d.key]
                          ? statusMeta[scores[d.key]].bar
                          : "bg-border")
                      }
                    />
                  ))}
                </div>
              </div>

              <Link
                to="/commitment"
                className="mt-8 inline-block text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Open the commitment document →
              </Link>

              <button
                onClick={handleAnalyze}
                disabled={running}
                className="mt-6 block w-full bg-foreground px-4 py-3 text-[12px] font-mono uppercase tracking-wider text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {running ? "Analyzing…" : analysis ? "Re-run AI analysis" : "Run AI accountability review"}
              </button>
              {error && (
                <p className="mt-3 text-[12px] text-destructive">{error}</p>
              )}
            </div>
          </aside>

          {/* Scoring */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {dimensions.map((d, i) => {
              const original = data[d.key];
              const current = scores[d.key];
              const dimA = perDimAnalysis[d.key];
              return (
                <div
                  key={d.key}
                  className="border border-border bg-card p-8"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <span className="number-tag">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="mt-2 font-serif text-[24px] leading-tight">
                        {d.label}
                      </h3>
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {d.question}
                      </p>
                    </div>
                    {current && (
                      <span
                        className={
                          "shrink-0 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-background " +
                          statusMeta[current].bar
                        }
                      >
                        {statusMeta[current].label}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 border-l-2 border-primary bg-muted/40 p-4">
                    <div className="eyebrow mb-2">Original commitment</div>
                    <p className="text-[14px] leading-relaxed text-foreground">
                      {original || (
                        <span className="italic text-muted-foreground">
                          Not specified at kickoff
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="eyebrow mb-2 block">Current value</label>
                    <textarea
                      value={(useStateCurrent(d.key))}
                      onChange={() => {}}
                      hidden
                    />
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {(Object.keys(statusMeta) as Status[]).map((s) => {
                      const active = current === s;
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            setScores((prev) => ({ ...prev, [d.key]: s }))
                          }
                          className={
                            "flex items-center gap-2 border px-4 py-2 text-[12px] transition-colors " +
                            (active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-background text-foreground hover:border-foreground/40")
                          }
                        >
                          <span className={`h-2 w-2 ${statusMeta[s].dot}`} />
                          {statusMeta[s].label}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    value={notes[d.key] || ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [d.key]: e.target.value }))
                    }
                    placeholder="What changed since the last check-in? Evidence, anecdote, number."
                    rows={3}
                    className="mt-4 w-full resize-none border border-border bg-background p-3 text-[14px] outline-none transition-colors focus:border-primary"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="h-24" />
    </AppShell>
  );
}