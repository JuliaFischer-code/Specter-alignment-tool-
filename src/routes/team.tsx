import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  blankPendingIdea,
  savePendingIdea,
  type PendingIdea,
} from "@/lib/team-store";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Conversation — Uncertainty Navigator" },
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
    placeholder: "e.g. Engineers spend two hours a week re-explaining the same context in code review.",
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

function TeamPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<PendingIdea>(blankPendingIdea);
  const [step, setStep] = useState(0);

  const total = questions.length;
  const current = questions[step];
  const value = answers[current.id];

  const progress = useMemo(
    () => questions.filter((q) => answers[q.id].trim().length > 0).length,
    [answers],
  );

  const update = (v: string) => setAnswers((a) => ({ ...a, [current.id]: v }));

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else finalize();
  };

  const finalize = () => {
    savePendingIdea(answers);
    navigate({ to: "/experiment-card" });
  };

  return (
    <AppShell teamMode>
      <PageHeader
        eyebrow="Team · Step 01 · Experiment conversation"
        title="Define a bet worth taking."
        lede="Six questions. No business case required. The point is to find something small enough to try in one week and honest enough to stop."
        teamStyle
      />

      <section className="mx-auto max-w-[1240px] px-8">
        <div className="grid grid-cols-12 gap-10">
          {/* Side rail */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="hairline pt-6">
              <div className="eyebrow mb-4">Question set</div>
              <ol className="space-y-1">
                {questions.map((q, i) => {
                  const done = answers[q.id].trim().length > 0;
                  const active = i === step;
                  return (
                    <li key={q.id}>
                      <button
                        onClick={() => setStep(i)}
                        className={
                          "group flex w-full items-start gap-3 border-l-2 py-2 pl-3 pr-2 text-left text-[13px] transition-colors " +
                          (active
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground")
                        }
                      >
                        <span className="number-tag w-6 shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 leading-snug">{q.question}</span>
                        <span
                          className={
                            "mt-1 h-1.5 w-1.5 shrink-0 rounded-full transition-colors " +
                            (done ? "bg-primary" : "bg-border")
                          }
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-8 border-t border-border pt-4 text-[12px] text-muted-foreground">
                {progress} of {total} answered
              </div>
            </div>
          </aside>

          {/* Conversation panel */}
          <div className="col-span-12 lg:col-span-8">
            <div className="border border-dashed border-border bg-card p-10">
              <span className="number-tag">
                Question {String(step + 1).padStart(2, "0")} / {total}
              </span>

              <h2 className="mt-6 font-serif text-[36px] leading-[1.1] tracking-wide">
                {current.question}
              </h2>
              <p className="mt-3 text-[13px] italic text-muted-foreground">
                {current.hint}
              </p>

              <textarea
                value={value}
                onChange={(e) => update(e.target.value)}
                placeholder={current.placeholder}
                rows={6}
                className="mt-8 w-full resize-none border border-border bg-background p-4 text-[15px] leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
                autoFocus
              />

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  ← Previous
                </button>
                {step < total - 1 ? (
                  <button
                    onClick={next}
                    className="bg-primary px-6 py-3 text-[13px] font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Next question →
                  </button>
                ) : (
                  <button
                    onClick={finalize}
                    className="bg-primary px-6 py-3 text-[13px] font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Generate experiment card →
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6 flex gap-1">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={
                    "h-px flex-1 transition-colors " +
                    (i <= step ? "bg-primary" : "bg-border")
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="h-24" />
    </AppShell>
  );
}
