import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Gauge,
  History,
  Save,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useCommitment, useCheckIns, type CheckInEntry } from "@/lib/commitment-store";
import { analyzeCheckIn, type CheckInAnalysis } from "@/lib/check-in.functions";

export const Route = createFileRoute("/check-in")({
  head: () => ({
    meta: [
      { title: "Project Check-in — Uncertainty Navigator" },
      {
        name: "description",
        content: "Re-score your AI pilot against the original affordable-loss commitment.",
      },
      { property: "og:title", content: "Project Check-in" },
      {
        property: "og:description",
        content: "Compare current pilot state to the commitment your team signed at kickoff.",
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
  hint: string;
}[] = [
  {
    key: "budgetCeiling",
    label: "Budget burn vs ceiling",
    question: "How much of the affordable-loss ceiling has been consumed?",
    hint: "Enter amount spent so far, e.g. '€45.000'",
  },
  {
    key: "timeBox",
    label: "Time elapsed vs box",
    question: "How much of the original time-box has elapsed?",
    hint: "e.g. '3 of 6 months' or '8 weeks in'",
  },
  {
    key: "killCriteria",
    label: "Kill criteria proximity",
    question: "Are any of the documented stop-conditions getting close?",
    hint: "e.g. '1 of 5 data incidents occurred' or 'none triggered yet'",
  },
  {
    key: "reputationalRisk",
    label: "Reputational exposure",
    question: "Has the surface area for reputational risk grown since kickoff?",
    hint: "e.g. 'No change' or 'Now customer-facing in 2 regions'",
  },
  {
    key: "opportunityCost",
    label: "Opportunity cost",
    question: "Is the displaced work still acceptable to the team?",
    hint: "e.g. 'Team still aligned' or 'Migration delay now causing friction'",
  },
];

const statusMeta: Record<Status, { label: string; bar: string; dot: string; bg: string }> = {
  "on-track": {
    label: "On track",
    bar: "bg-primary",
    dot: "bg-primary",
    bg: "bg-primary/10 text-primary",
  },
  watch: {
    label: "Watch",
    bar: "bg-yellow-600",
    dot: "bg-yellow-600",
    bg: "bg-yellow-600/10 text-yellow-700",
  },
  breach: {
    label: "Breach",
    bar: "bg-destructive",
    dot: "bg-destructive",
    bg: "bg-destructive/10 text-destructive",
  },
};

function createCheckInId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `check-in-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function extractFirstNumber(value: string) {
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function getLimitProximity(original: string | undefined, current: string | undefined) {
  const originalNumber = extractFirstNumber(original || "");
  const currentNumber = extractFirstNumber(current || "");

  if (!originalNumber || !currentNumber) return null;

  const percent = Math.max(0, Math.min(140, Math.round((currentNumber / originalNumber) * 100)));
  return {
    percent,
    label:
      percent >= 100 ? "Limit crossed" : percent >= 75 ? "Close to boundary" : "Inside boundary",
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CheckInTimeline({ checkIns }: { checkIns: CheckInEntry[] }) {
  if (checkIns.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="rounded-[8px] bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <div className="mb-6 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
          <History className="h-4 w-4 text-[#24bf7a]" />
          Check-in history
        </div>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute bottom-0 left-[11px] top-0 w-px bg-[#e4e0de]" />
          <div className="space-y-6">
            {checkIns.map((entry, i) => {
              const isLatest = i === checkIns.length - 1;
              const meta = statusMeta[entry.verdict];
              return (
                <div key={entry.id} className="relative flex items-start gap-6 pl-8">
                  {/* Dot */}
                  <span
                    className={`absolute left-0 top-1 flex h-[23px] w-[23px] items-center justify-center rounded-full border-2 border-white ${meta.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[12px] font-bold text-[#697081]">
                        {formatDate(entry.createdAt)}
                      </span>
                      <span
                        className={`rounded-[6px] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${meta.bg}`}
                      >
                        {isLatest ? "Latest · " : ""}
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {dimensions.map((d) => {
                        const score = entry.scores[d.key];
                        if (!score) return null;
                        const m = statusMeta[score];
                        return (
                          <span
                            key={d.key}
                            className="flex items-center gap-1 text-[11px] font-medium text-[#697081]"
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                            {d.label}
                          </span>
                        );
                      })}
                    </div>
                    {/* Current values summary */}
                    <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
                      {dimensions.map((d) => {
                        const val = entry.currentValues[d.key];
                        if (!val) return null;
                        return (
                          <div key={d.key} className="text-[12px] font-medium">
                            <span className="text-[#697081]">{d.label}: </span>
                            <span className="text-[#07122f]">{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckInPage() {
  const { data, hydrated } = useCommitment();
  const { checkIns, add: addCheckIn } = useCheckIns();
  const [scores, setScores] = useState<Record<string, Status>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [currentValues, setCurrentValues] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<CheckInAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runAnalysis = useServerFn(analyzeCheckIn);

  const verdict = useMemo<Status>(() => {
    if (analysis) return analysis.overallVerdict;
    const vals = Object.values(scores);
    if (vals.includes("breach")) return "breach";
    if (vals.includes("watch")) return "watch";
    return "on-track";
  }, [scores, analysis]);

  const perDimAnalysis = useMemo(() => {
    const map: Record<string, { verdict: Status; driftSummary: string }> = {};
    if (analysis) {
      for (const d of analysis.dimensions) {
        map[d.key] = { verdict: d.verdict, driftSummary: d.driftSummary };
      }
    }
    return map;
  }, [analysis]);

  if (!hydrated)
    return (
      <AppShell>
        <div className="h-screen" />
      </AppShell>
    );

  if (!data || !data.createdAt) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1240px] px-8 py-32 text-center">
          <div className="eyebrow">No commitment to check against</div>
          <h1 className="mt-4 font-serif text-[40px]">Create a commitment first.</h1>
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
  const latestCheckIn = checkIns.at(-1);

  function handleSaveCheckIn(overrideVerdict?: Status) {
    const entry: CheckInEntry = {
      id: createCheckInId(),
      createdAt: new Date().toISOString(),
      verdict: overrideVerdict || verdict,
      scores,
      currentValues,
      notes,
    };
    addCheckIn(entry);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

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
            current: currentValues[d.key] || "",
            selfScore: scores[d.key],
            notes: notes[d.key],
          })),
        },
      });
      setAnalysis(result);
      const next: Record<string, Status> = {};
      for (const dim of result.dimensions) next[dim.key] = dim.verdict;
      setScores((prev) => ({ ...prev, ...next }));
      // Auto-save after AI analysis
      handleSaveCheckIn(result.overallVerdict);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-[1340px] px-6 py-8">
        <div className="mb-6 grid grid-cols-1 gap-5 rounded-[8px] bg-[#07122f] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] xl:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-4 inline-flex rounded-[8px] bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#24bf7a]">
              Manager · Step 03 · Check-in
            </div>
            <h1 className="max-w-[860px] font-sans text-[48px] font-black leading-[1.02] tracking-normal text-white md:text-[64px]">
              Are we still inside the affordable-loss envelope?
            </h1>
            <p className="mt-5 max-w-[760px] text-[16px] leading-relaxed text-white/70">
              Score live pilot evidence against the original commitment and keep a timeline of every
              status shift for manager review.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 self-end">
            <CheckHeroMetric label="Scored" value={`${completed}/${total}`} />
            <CheckHeroMetric label="History" value={checkIns.length} />
          </div>
        </div>

        <CheckInTimeline checkIns={checkIns} />

        <div className="grid grid-cols-12 gap-6">
          {/* Verdict rail */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="sticky top-8 rounded-[8px] bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
                <Activity className="h-4 w-4 text-[#24bf7a]" />
                Live verdict
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className={`h-3 w-3 ${statusMeta[verdict].dot}`} />
                <span className="text-[34px] font-black leading-none text-[#07122f]">
                  {statusMeta[verdict].label}
                </span>
              </div>
              <p className="mt-4 text-[13px] font-medium leading-relaxed text-[#697081]">
                {verdict === "breach" &&
                  "At least one dimension has crossed the line you drew at kickoff. Convene the sponsor before continuing."}
                {verdict === "watch" &&
                  "Nothing is breached, but signals are drifting. Bring this to the next steering review."}
                {verdict === "on-track" &&
                  "All scored dimensions remain inside the commitment envelope."}
              </p>

              <div className="mt-8 border-t border-[#e4e0de] pt-4">
                <div className="flex items-baseline justify-between text-[12px] font-medium text-[#697081]">
                  <span>Scored</span>
                  <span className="font-bold text-[#07122f]">
                    {completed}/{total}
                  </span>
                </div>
                <div className="mt-2 flex gap-1">
                  {dimensions.map((d) => (
                    <div
                      key={d.key}
                      className={
                        "h-1 flex-1 " +
                        (scores[d.key] ? statusMeta[scores[d.key]].bar : "bg-border")
                      }
                    />
                  ))}
                </div>
              </div>

              <Link
                to="/commitment"
                className="mt-8 inline-flex items-center gap-2 text-[12px] font-bold text-[#697081] underline-offset-4 hover:text-[#07122f] hover:underline"
              >
                <FileText className="h-4 w-4" />
                Open the commitment document
              </Link>

              <button
                onClick={handleAnalyze}
                disabled={running}
                className="mt-6 block w-full rounded-[8px] bg-[#07122f] px-4 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {running
                  ? "Analyzing…"
                  : analysis
                    ? "Re-run AI analysis"
                    : "Run AI accountability review"}
              </button>

              <button
                onClick={() => handleSaveCheckIn()}
                disabled={completed === 0}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[8px] border border-[#e4e0de] bg-white px-4 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#07122f] transition-colors hover:bg-[#dff5eb] disabled:opacity-30"
              >
                <Save className="h-4 w-4" />
                {saved ? "Saved to history" : "Save check-in"}
              </button>

              {checkIns.length > 0 && (
                <p className="mt-3 text-[12px] font-medium text-[#697081]">
                  {checkIns.length} check-in{checkIns.length > 1 ? "s" : ""} recorded
                  {latestCheckIn ? ` · Latest ${formatDate(latestCheckIn.createdAt)}` : ""}
                </p>
              )}

              {error && <p className="mt-3 text-[12px] text-destructive">{error}</p>}
            </div>
          </aside>

          {/* Scoring */}
          <div className="col-span-12 space-y-6 lg:col-span-8">
            {dimensions.map((d, i) => {
              const original = data[d.key];
              const selfScore = scores[d.key];
              const dimA = perDimAnalysis[d.key];
              const proximity = getLimitProximity(original, currentValues[d.key]);

              // Find last value from history for this dimension
              const lastEntry = checkIns.length > 0 ? checkIns[checkIns.length - 1] : null;
              const lastValue = lastEntry?.currentValues[d.key];

              return (
                <div
                  key={d.key}
                  className="rounded-[8px] bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <span className="font-mono text-[12px] font-bold text-[#08764c]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="mt-2 font-sans text-[26px] font-black leading-tight tracking-normal text-[#07122f]">
                        {d.label}
                      </h3>
                      <p className="mt-1 text-[13px] font-medium text-[#697081]">{d.question}</p>
                    </div>
                    {selfScore && (
                      <span
                        className={
                          "shrink-0 rounded-[7px] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white " +
                          statusMeta[selfScore].bar
                        }
                      >
                        {statusMeta[selfScore].label}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 rounded-[8px] border-l-4 border-[#24bf7a] bg-[#f7f5f4] p-4">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
                      Original commitment
                    </div>
                    <p className="text-[14px] font-medium leading-relaxed text-[#07122f]">
                      {original || (
                        <span className="italic text-[#697081]">Not specified at kickoff</span>
                      )}
                    </p>
                  </div>

                  {lastValue && (
                    <div className="mt-3 rounded-[8px] border-l-4 border-[#d9d5d2] bg-[#faf9f8] p-4">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
                        Last check-in
                      </div>
                      <p className="text-[13px] font-medium text-[#697081]">
                        {lastValue}
                        <span className="ml-2 text-[11px]">
                          · {formatDate(lastEntry!.createdAt)}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
                      Current value
                    </label>
                    <textarea
                      value={currentValues[d.key] || ""}
                      onChange={(e) => setCurrentValues((c) => ({ ...c, [d.key]: e.target.value }))}
                      placeholder={d.hint}
                      rows={2}
                      className="w-full resize-none rounded-[8px] border border-[#e4e0de] bg-[#f7f5f4] p-3 text-[14px] font-medium text-[#07122f] outline-none transition-colors focus:border-[#24bf7a] focus:bg-white"
                    />
                  </div>

                  {proximity && (
                    <div className="mt-4 rounded-[8px] bg-[#f7f5f4] p-4">
                      <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-[#697081]">
                        <span>Limit proximity</span>
                        <span>
                          {proximity.percent}% · {proximity.label}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-[#e4e0de]">
                        <div
                          className={
                            "h-full rounded-full " +
                            (proximity.percent >= 100
                              ? "bg-red-600"
                              : proximity.percent >= 75
                                ? "bg-[#d79000]"
                                : "bg-[#24bf7a]")
                          }
                          style={{ width: `${Math.min(100, proximity.percent)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {dimA && (
                    <div
                      className={
                        "mt-4 rounded-[8px] border-l-4 p-4 " +
                        (dimA.verdict === "breach"
                          ? "border-red-600 bg-red-50"
                          : dimA.verdict === "watch"
                            ? "border-[#d79000] bg-[#fff8e8]"
                            : "border-[#24bf7a] bg-[#dff5eb]")
                      }
                    >
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#697081]">
                        <Gauge className="h-4 w-4" />
                        AI drift analysis
                      </div>
                      <p className="text-[14px] font-medium leading-relaxed text-[#07122f]">
                        {dimA.driftSummary}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-2">
                    {(Object.keys(statusMeta) as Status[]).map((s) => {
                      const active = selfScore === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setScores((prev) => ({ ...prev, [d.key]: s }))}
                          className={
                            "flex items-center gap-2 rounded-[8px] px-4 py-2 text-[12px] font-bold transition-colors " +
                            (active
                              ? "bg-[#07122f] text-white"
                              : "bg-[#f7f5f4] text-[#07122f] hover:bg-[#dff5eb]")
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
                    onChange={(e) => setNotes((n) => ({ ...n, [d.key]: e.target.value }))}
                    placeholder="What changed since the last check-in? Evidence, anecdote, number."
                    rows={3}
                    className="mt-4 w-full resize-none rounded-[8px] border border-[#e4e0de] bg-[#f7f5f4] p-3 text-[14px] font-medium text-[#07122f] outline-none transition-colors focus:border-[#24bf7a] focus:bg-white"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {analysis && (
        <section className="mx-auto mt-12 max-w-[1340px] px-6">
          <div
            className={
              "rounded-[8px] bg-white p-8 shadow-[0_18px_48px_rgba(15,23,42,0.06)] " +
              (analysis.overallVerdict === "breach"
                ? "border border-red-600"
                : analysis.overallVerdict === "watch"
                  ? "border border-[#d79000]"
                  : "border border-[#24bf7a]")
            }
          >
            <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
              <AlertTriangle className="h-4 w-4 text-[#d79000]" />
              Accountability response
            </div>
            <h2 className="font-sans text-[32px] font-black leading-tight tracking-normal text-[#07122f]">
              {analysis.headline}
            </h2>

            {analysis.violatedKillCriteria.length > 0 && (
              <div className="mt-6 rounded-[8px] bg-red-50 p-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-red-600">
                  Violated kill criteria
                </div>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] font-medium text-[#07122f]">
                  {analysis.violatedKillCriteria.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
            )}

            <pre className="mt-6 whitespace-pre-wrap font-sans text-[15px] font-medium leading-relaxed text-[#07122f]">
              {analysis.accountabilityResponse}
            </pre>
          </div>
        </section>
      )}

      <div className="h-24" />
    </AppShell>
  );
}

function CheckHeroMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[8px] bg-white p-4 text-[#07122f]">
      <div className="text-[34px] font-black leading-none">{value}</div>
      <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d93a1]">
        {label}
      </div>
    </div>
  );
}
