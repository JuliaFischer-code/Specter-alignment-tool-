import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  blankCommitment,
  promptScript,
  sampleCommitment,
  saveCommitment,
  type CommitmentData,
} from "@/lib/commitment-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Uncertainty Navigator — Define Affordable Loss" },
      {
        name: "description",
        content:
          "A structured conversation that helps teams define affordable loss before starting an AI pilot.",
      },
      { property: "og:title", content: "Uncertainty Navigator" },
      {
        property: "og:description",
        content:
          "Define affordable loss before you commit. A pre-pilot conversation for AI initiatives.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<CommitmentData>(blankCommitment);
  const [step, setStep] = useState(0);
  const total = promptScript.length;
  const current = promptScript[step];
  const value = answers[current.id];
  const progress = useMemo(
    () =>
      promptScript.filter((p) => answers[p.id].trim().length > 0).length,
    [answers],
  );

  const update = (v: string) =>
    setAnswers((a) => ({ ...a, [current.id]: v }));

  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else finalize(answers);
  };

  const finalize = (data: CommitmentData) => {
    const final = { ...data, createdAt: new Date().toISOString() };
    saveCommitment(final);
    navigate({ to: "/commitment" });
  };

  const loadSample = () => {
    setAnswers(sampleCommitment);
    setStep(total - 1);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Screen 01 · Pre-commitment conversation"
        title="Decide what you can afford to lose — before the pilot starts."
        lede="Affordable Loss is the disciplined alternative to expected return. Walk through nine questions; the answers become a written commitment your steering committee can hold you to."
      />

      <section className="mx-auto max-w-[1240px] px-8">
        <div className="grid grid-cols-12 gap-10">
          {/* Side rail */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="hairline pt-6">
              <div className="eyebrow mb-4">Question set</div>
              <ol className="space-y-1">
                {promptScript.map((p, i) => {
                  const done = answers[p.id].trim().length > 0;
                  const active = i === step;
                  return (
                    <li key={p.id}>
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
                        <span className="flex-1 leading-snug">{p.question}</span>
                        <span
                          className={
                            "mt-1 h-1.5 w-1.5 shrink-0 rounded-full " +
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
            <div className="border border-border bg-card p-10">
              <div className="flex items-center justify-between">
                <span className="number-tag">
                  Question {String(step + 1).padStart(2, "0")} / {total}
                </span>
                <button
                  onClick={loadSample}
                  className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Load worked example
                </button>
              </div>

              <h2 className="mt-6 font-serif text-[36px] leading-[1.1]">
                {current.question}
              </h2>
              <p className="mt-3 text-[14px] italic text-muted-foreground">
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
                <div className="flex items-center gap-3">
                  {step < total - 1 ? (
                    <button
                      onClick={next}
                      className="bg-primary px-6 py-3 text-[13px] font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Next question →
                    </button>
                  ) : (
                    <button
                      onClick={() => finalize(answers)}
                      className="bg-primary px-6 py-3 text-[13px] font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Generate commitment document →
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6 flex gap-1">
              {promptScript.map((_, i) => (
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
