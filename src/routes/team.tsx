import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Lightbulb,
  Rocket,
  Sparkles,
  Target,
  TimerReset,
} from "lucide-react";
import { AppShell, FlipHeroMetric } from "@/components/app-shell";
import { blankPendingIdea, savePendingIdea, type PendingIdea } from "@/lib/team-store";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Conversation — Specter" },
      {
        name: "description",
        content: "Define a one-week experiment worth betting on.",
      },
    ],
  }),
  component: TeamPage,
});

const questions: {
  id: keyof PendingIdea;
  question: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    id: "problem",
    question: "What problem have you noticed?",
    hint: "One sentence, from a user perspective.",
    placeholder:
      "e.g. Engineers spend two hours a week re-explaining the same context in code review.",
  },
  {
    id: "whoHasIt",
    question: "Who has this problem?",
    hint: "A specific role, team, or type of person.",
    placeholder: "e.g. Mid-level engineers on teams larger than 8 people.",
  },
  {
    id: "experiment",
    question: "What's the smallest thing you could try in one week?",
    hint: "An experiment, not a product.",
    placeholder: "e.g. Add a structured PR template and see if review cycles shorten by 20%.",
  },
  {
    id: "willingToRisk",
    question: "What are you willing to give up to try this?",
    hint: "Time, money, political capital.",
    placeholder: "e.g. 4 hours of my own time and one Friday afternoon team sync.",
  },
  {
    id: "goSignal",
    question: "What would tell you this idea is worth pursuing?",
    hint: "One concrete signal, not revenue.",
    placeholder: "e.g. At least 3 engineers say review felt clearer without me asking.",
  },
  {
    id: "stopSignal",
    question: "What would make you stop?",
    hint: "Be honest about your kill criterion.",
    placeholder: "e.g. No measurable change in review time after two full cycles.",
  },
];

const teamExamples: PendingIdea[] = [
  {
    problem:
      "Engineers spend too much time triaging noisy crash reports before finding the root cause.",
    whoHasIt: "Mobile engineers on the release support rotation.",
    experiment:
      "Use an LLM to summarize crash reports into 3-line root cause hypotheses for one week.",
    willingToRisk: "Five hours of setup time and one evening of manual verification.",
    goSignal: "Triage time drops from two hours to under 20 minutes on at least 60% of reports.",
    stopSignal: "The summary is wrong on more than 30% of crashes.",
  },
  {
    problem:
      "Customer success keeps answering the same onboarding questions in separate Slack threads.",
    whoHasIt: "CS managers supporting new enterprise accounts.",
    experiment:
      "Create a searchable answer board from the top 20 onboarding questions and test it for one week.",
    willingToRisk: "One afternoon of documentation work.",
    goSignal: "Repeated onboarding questions drop by half in the pilot channel.",
    stopSignal:
      "People keep asking in Slack because the answer board is slower than asking a person.",
  },
];

function TeamPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<PendingIdea>(blankPendingIdea);
  const [step, setStep] = useState(0);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [triedEmpty, setTriedEmpty] = useState<Set<number>>(new Set());

  const total = questions.length;
  const current = questions[step];
  const value = answers[current.id];

  const progress = useMemo(
    () => questions.filter((q) => answers[q.id].trim().length > 0).length,
    [answers],
  );
  const currentLength = value.trim().length;
  const readiness = Math.min(
    100,
    Math.round((progress / total) * 72 + Math.min(28, currentLength / 5)),
  );

  const update = (v: string) => setAnswers((a) => ({ ...a, [current.id]: v }));

  const next = () => {
    if (value.trim().length === 0) {
      setTriedEmpty((prev) => new Set([...prev, step]));
    }
    if (step < total - 1) setStep(step + 1);
    else finalize();
  };

  const finalize = () => {
    savePendingIdea(answers);
    navigate({ to: "/experiment-card" });
  };

  const applyExample = (example: PendingIdea) => {
    setAnswers(example);
    setStep(2);
    setShowAllQuestions(false);
  };

  const dotFill = (i: number, q: (typeof questions)[0]) => {
    if (answers[q.id].trim().length > 0) return "#22c55e";
    if (triedEmpty.has(i)) return "#ef4444";
    return "#d1d5db";
  };

  return (
    <AppShell teamMode>
      <div className="min-h-screen bg-[#f4f6f9]">
        <section className="mx-auto max-w-[1340px] px-6 py-8">
          {/* Hero banner */}
          <div className="relative mb-6">
            <div className="specter-fluid-hero grid grid-cols-1 gap-5 rounded-t-[16px] bg-[#07122f] p-6 text-white xl:grid-cols-[1fr_360px]">
              <div className="specter-fluid-hero-mist" />
              <div>
                <div className="action-title-shine mb-4 inline-flex rounded-[8px] bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#24bf7a]">
                  Team · Step 01 · Experiment studio
                </div>
                <h1 className="max-w-[820px] font-sans text-[52px] font-black leading-[0.98] tracking-normal text-white md:text-[72px]">
                  Define a bet worth taking
                </h1>
                <p className="mt-5 max-w-[680px] text-[16px] leading-relaxed text-white/70">
                  Six answers turn a loose idea into a one-week experiment with a clear go signal,
                  stop signal, and risk boundary.
                </p>
              </div>
              <div className="self-end xl:justify-self-end">
                <FlipHeroMetric
                  frontLabel="Answered"
                  frontValue={`${progress}/${total}`}
                  backLabel="Readiness"
                  backValue={`${readiness}%`}
                />
              </div>
            </div>
            <div className="h-10 bg-gradient-to-b from-[#07122f] to-[#f4f6f9]" />
          </div>

          {/* Progress stepper + toggle button */}
          <div className="mb-2 flex items-center gap-4 px-1">
            <div className="flex flex-1 items-center">
              {questions.map((q, i) => {
                const active = i === step;
                const fill = dotFill(i, q);
                return (
                  <Fragment key={q.id}>
                    {i > 0 && (
                      <div
                        className="h-0.5 flex-1"
                        style={{ backgroundColor: i <= step ? "#22c55e" : "#d1d5db" }}
                      />
                    )}
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <button
                        onClick={() => setStep(i)}
                        aria-label={`Go to question ${i + 1}`}
                        style={{
                          width: active ? 14 : 10,
                          height: active ? 14 : 10,
                          borderRadius: "50%",
                          backgroundColor: fill,
                          boxShadow: active ? `0 0 0 4px ${fill}44` : "none",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "block",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "monospace",
                          color: "#697081",
                          lineHeight: 1,
                        }}
                      >
                        Q{i + 1}
                      </span>
                    </div>
                  </Fragment>
                );
              })}
            </div>
            <button
              onClick={() => setShowAllQuestions((v) => !v)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-bold text-[#697081] transition-colors hover:bg-white hover:text-[#07122f]"
            >
              {showAllQuestions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {showAllQuestions ? "Hide questions" : "Show all questions"}
            </button>
          </div>

          {/* Collapsible question overview panel */}
          <div
            style={{
              maxHeight: showAllQuestions ? "640px" : "0",
              overflow: "hidden",
              transition: "max-height 0.3s ease",
            }}
          >
            <div className="mb-6 rounded-[16px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.10)]">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_260px]">
                <div>
                  <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
                    Question set
                  </div>
                  <ol className="space-y-1">
                    {questions.map((q, i) => {
                      const active = i === step;
                      return (
                        <li key={q.id}>
                          <button
                            onClick={() => {
                              setStep(i);
                              setShowAllQuestions(false);
                            }}
                            className={
                              "group flex w-full items-start gap-3 rounded-[12px] px-4 py-3 text-left text-[13px] font-semibold transition-all " +
                              (active
                                ? "bg-[#f4f6f9] text-[#07122f]"
                                : "text-[#697081] hover:bg-[#f4f6f9] hover:text-[#07122f]")
                            }
                          >
                            <span className="w-6 shrink-0 font-mono text-[11px] text-[#08764c]">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="flex-1 leading-snug">{q.question}</span>
                            <span
                              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full transition-colors"
                              style={{ backgroundColor: dotFill(i, q) }}
                              aria-hidden
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
                <div className="border-t pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
                    <Sparkles className="h-4 w-4 text-[#24bf7a]" />
                    Quick starts
                  </div>
                  <div className="space-y-3">
                    {teamExamples.map((example) => (
                      <button
                        key={example.problem}
                        onClick={() => applyExample(example)}
                        className="w-full rounded-[14px] bg-[#f4f6f9] p-4 text-left transition-all hover:bg-[#f0faf5]"
                      >
                        <div className="text-[13px] font-bold leading-snug text-[#07122f]">
                          {example.problem}
                        </div>
                        <div className="mt-2 text-[12px] font-medium text-[#697081]">
                          Fill an example experiment
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two-column main layout */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            {/* Main question card */}
            <div className="rounded-[16px] bg-white p-10 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <span className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-[#08764c]">
                Question {String(step + 1).padStart(2, "0")} / {total}
              </span>

              <h2 className="mt-5 font-sans text-[30px] font-black leading-[1.05] tracking-normal text-[#07122f]">
                {current.question}
              </h2>
              <p className="mt-3 text-[14px] font-medium text-[#697081]">{current.hint}</p>

              <textarea
                value={value}
                onChange={(e) => update(e.target.value)}
                placeholder={current.placeholder}
                rows={8}
                className="mt-8 w-full resize-none rounded-[12px] border border-[#e4e0de] bg-[#f4f6f9] p-4 text-[15px] font-medium leading-relaxed text-[#07122f] outline-none transition-colors focus:border-[#24bf7a] focus:bg-white"
                autoFocus
              />

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  className="text-[13px] font-bold text-[#697081] transition-colors hover:text-[#07122f] disabled:opacity-30"
                >
                  ← Previous
                </button>
                {step < total - 1 ? (
                  <button
                    onClick={next}
                    className="inline-flex items-center gap-2 rounded-[12px] bg-[#07122f] px-6 py-3 text-[13px] font-bold tracking-wide text-white transition-transform hover:-translate-y-0.5"
                  >
                    Next question <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={finalize}
                    className="inline-flex items-center gap-2 rounded-[12px] bg-[#24bf7a] px-6 py-3 text-[13px] font-bold tracking-wide text-[#07122f] transition-transform hover:-translate-y-0.5"
                  >
                    Generate experiment card <Rocket className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <BetSignalPanel
              progress={progress}
              total={total}
              readiness={readiness}
              currentLength={currentLength}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StudioMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] bg-white p-4 text-[#07122f]">
      <div className="text-[34px] font-black leading-none">{value}</div>
      <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d93a1]">
        {label}
      </div>
    </div>
  );
}

function BetSignalPanel({
  progress,
  total,
  readiness,
  currentLength,
}: {
  progress: number;
  total: number;
  readiness: number;
  currentLength: number;
}) {
  const checks = [
    { label: "Small enough for one week", icon: TimerReset, active: progress >= 3 },
    { label: "Named risk boundary", icon: Target, active: progress >= 4 },
    { label: "Go and stop signals", icon: BadgeCheck, active: progress >= 6 },
    { label: "Answer has usable detail", icon: ClipboardList, active: currentLength >= 40 },
  ];

  return (
    <div className="rounded-[12px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
        <Lightbulb className="h-4 w-4 text-[#24bf7a]" />
        Bet signal
      </div>
      <div className="rounded-[16px] bg-[#07122f] p-5 text-white shadow-[0_4px_20px_rgba(7,18,47,0.22)]">
        <div className="text-[44px] font-black leading-none">{readiness}%</div>
        <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
          Experiment readiness
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/12">
          <div className="h-full rounded-full bg-[#24bf7a]" style={{ width: `${readiness}%` }} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <div
              key={check.label}
              className={
                "flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-all " +
                (check.active
                  ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.07)] text-[#07122f]"
                  : "text-[#697081]")
              }
            >
              <Icon className={check.active ? "h-4 w-4 text-[#24bf7a]" : "h-4 w-4"} />
              {check.label}
            </div>
          );
        })}
      </div>

      <div className="mt-5 text-[12px] font-medium text-[#697081]">
        {progress}/{total} answers captured · {currentLength} characters on current answer
      </div>
    </div>
  );
}
