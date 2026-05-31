import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  usePendingIdea,
  useIdeas,
  savePendingEvaluation,
  loadPendingEvaluation,
  type IdeaCard,
  type MentorEvaluation,
} from "@/lib/team-store";
import { evaluateIdea } from "@/lib/idea-evaluator.functions";

export const Route = createFileRoute("/experiment-card")({
  head: () => ({
    meta: [
      { title: "Experiment Card — Specter" },
      {
        name: "description",
        content: "Your one-week bet, written down before you start.",
      },
    ],
  }),
  component: ExperimentCardPage,
});

function ExperimentCardPage() {
  const navigate = useNavigate();
  const { data, hydrated } = usePendingIdea();
  const { add } = useIdeas();
  const [author, setAuthor] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<MentorEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const confettiFired = useRef(false);

  useEffect(() => {
    if (!hydrated || !data || !data.problem.trim()) return;

    const cached = loadPendingEvaluation();
    if (cached) {
      setEvaluation(cached);
      return;
    }

    setEvaluating(true);
    evaluateIdea({ data })
      .then((result) => {
        savePendingEvaluation(result);
        setEvaluation(result);
      })
      .finally(() => setEvaluating(false));
  }, [hydrated, data]);

  useEffect(() => {
    if (evaluation?.verdict === "pursue" && !confettiFired.current) {
      confettiFired.current = true;
      const burst = () =>
        confetti({
          particleCount: 300,
          spread: 100,
          origin: { x: 0.5, y: 0.2 },
          colors: ["#1a5c2e", "#4ade80", "#f5f5f0"],
          gravity: 1.2,
          ticks: 180,
        });
      burst();
      setTimeout(burst, 300);
    }
  }, [evaluation?.verdict]);

  if (!hydrated) {
    return (
      <AppShell teamMode>
        <div className="mx-auto max-w-[1240px] px-8 py-24 text-center text-muted-foreground">
          Loading…
        </div>
      </AppShell>
    );
  }

  if (!data || !data.problem.trim()) {
    return (
      <AppShell teamMode>
        <div className="mx-auto max-w-[1240px] px-8 py-24 text-center">
          <p className="text-muted-foreground">
            No experiment in progress.{" "}
            <Link to="/team" className="text-foreground underline underline-offset-4">
              Start the conversation →
            </Link>
          </p>
        </div>
      </AppShell>
    );
  }

  if (evaluating) {
    return (
      <AppShell teamMode>
        <EvaluatingState />
      </AppShell>
    );
  }

  const handleSubmit = () => {
    if (!author.trim()) return;
    const idea: IdeaCard = {
      id: `idea-${Date.now()}`,
      author: author.trim(),
      problem: data.problem,
      whoHasIt: data.whoHasIt,
      experiment: data.experiment,
      willingToRisk: data.willingToRisk,
      goSignal: data.goSignal,
      stopSignal: data.stopSignal,
      status: "On track · Week 1",
      checkIns: [],
      createdAt: new Date().toISOString(),
      mentorEvaluation: evaluation ?? undefined,
    };
    add(idea);
    setSubmitted(true);
    navigate({ to: "/idea-board" });
  };

  return (
    <AppShell teamMode>
      <PageHeader
        eyebrow="Team · Step 02 · Experiment card"
        title="This is not a business case. This is a bet worth taking."
        teamStyle
      />

      <section className="mx-auto max-w-[1240px] px-8">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-8 lg:col-start-3">
            {/* Mentor Verdict */}
            {evaluation && <MentorVerdictBlock evaluation={evaluation} />}

            {/* Card */}
            <div
              className={`border border-dashed border-border bg-card ${evaluation ? "mt-10" : ""}`}
            >
              {/* Card header */}
              <div className="border-b border-border px-10 py-8">
                <div className="eyebrow mb-2">Experiment Card</div>
                <p className="font-serif text-[28px] leading-snug">{data.problem}</p>
                <p className="mt-2 text-[14px] text-muted-foreground">Affects: {data.whoHasIt}</p>
              </div>

              {/* Card body */}
              <div className="divide-y divide-border">
                <Row label="The one-week experiment" value={data.experiment} />
                <Row label="Willing to risk" value={data.willingToRisk} />
                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="px-8 py-6">
                    <div className="eyebrow mb-2 text-primary">Go signal</div>
                    <p className="text-[14px] leading-relaxed">{data.goSignal}</p>
                  </div>
                  <div className="px-8 py-6">
                    <div className="eyebrow mb-2 text-destructive">Stop signal</div>
                    <p className="text-[14px] leading-relaxed">{data.stopSignal}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit to board */}
            <div className="mt-8 border border-dashed border-border bg-card p-8">
              <div className="eyebrow mb-4">Submit to Idea Board</div>
              <p className="mb-6 text-[14px] text-muted-foreground">
                Add your name so the team can see who's running this experiment.
              </p>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name & role — e.g. Alex P., Frontend Engineer"
                  className="flex-1 border border-border bg-background px-4 py-3 text-[14px] text-foreground outline-none transition-colors focus:border-primary"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!author.trim() || submitted}
                  className="shrink-0 bg-primary px-6 py-3 text-[13px] font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Submit to Idea Board →
                </button>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/team"
                className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                ← Edit answers
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="h-24" />
    </AppShell>
  );
}

function EvaluatingState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-8">
      <div className="text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              style={{
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <p className="font-serif text-[32px] leading-tight text-foreground">
          Evaluating your idea…
        </p>
        <p className="mt-4 text-[14px] text-muted-foreground">
          A mentor is reviewing your experiment.
        </p>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

function MentorVerdictBlock({ evaluation }: { evaluation: MentorEvaluation }) {
  const verdictConfig = {
    pursue: {
      label: "Pursue",
      textColor: "text-primary",
      borderColor: "border-primary",
      bgColor: "bg-accent",
      dotColor: "bg-primary",
    },
    pause: {
      label: "Pause",
      textColor: "text-amber-600",
      borderColor: "border-amber-500/40",
      bgColor: "bg-amber-50/60",
      dotColor: "bg-amber-500",
    },
    drop: {
      label: "Drop",
      textColor: "text-destructive",
      borderColor: "border-destructive/30",
      bgColor: "bg-destructive/5",
      dotColor: "bg-destructive",
    },
  }[evaluation.verdict];

  const strengthConfig: Record<string, { label: string; color: string }> = {
    strong: { label: "Strong painkiller", color: "text-primary" },
    weak: { label: "Feels like a vitamin", color: "text-amber-600" },
    unclear: { label: "Hard to tell", color: "text-muted-foreground" },
  };

  const qualityConfig: Record<string, { label: string; color: string }> = {
    sharp: { label: "Sharp and testable", color: "text-primary" },
    vague: { label: "Too vague to measure", color: "text-amber-600" },
    "too big": { label: "Too big for one week", color: "text-destructive" },
  };

  const strength = strengthConfig[evaluation.problemStrength];
  const quality = qualityConfig[evaluation.experimentQuality];

  return (
    <div className={`border ${verdictConfig.borderColor} ${verdictConfig.bgColor}`}>
      {/* Verdict header */}
      <div className="border-b border-border/50 px-10 py-8">
        <div className="eyebrow mb-4">Mentor Verdict</div>
        <div className="flex items-baseline gap-4">
          <span className={`font-serif text-[52px] leading-none ${verdictConfig.textColor}`}>
            {verdictConfig.label}
          </span>
          <span
            className={`h-2 w-2 shrink-0 translate-y-1 rounded-full ${verdictConfig.dotColor}`}
            aria-hidden
          />
        </div>
        <p className="mt-3 font-serif text-[18px] leading-snug text-foreground/80 italic">
          {evaluation.verdictReason}
        </p>
      </div>

      {/* Signal rows */}
      <div className="divide-y divide-border/40 px-10 py-2">
        <SignalRow label="Problem strength" value={strength.label} valueColor={strength.color} />
        <SignalRow label="Experiment quality" value={quality.label} valueColor={quality.color} />
        <SignalRow
          label="Biggest blindspot"
          value={evaluation.biggestBlindspot}
          valueColor="text-foreground"
        />
      </div>

      {/* Mentor note pull quote */}
      <div className="border-t border-border/50 px-10 py-8">
        <div className="eyebrow mb-4">Mentor note</div>
        <div className="inline-block bg-amber-50 px-5 py-4 border border-amber-200/60 shadow-sm">
          <p className="font-serif text-[16px] leading-relaxed text-foreground">
            {evaluation.mentorNote}
          </p>
        </div>
      </div>
    </div>
  );
}

function SignalRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-4">
      <span className="text-[12px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={`text-[13px] font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-8 py-6">
      <div className="eyebrow mb-2">{label}</div>
      <p className="text-[15px] leading-relaxed">{value}</p>
    </div>
  );
}
