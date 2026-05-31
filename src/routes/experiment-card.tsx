import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { AppShell } from "@/components/app-shell";
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
        <div className="min-h-screen bg-[#f4f6f9]">
          <EvaluatingState />
        </div>
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
      <div className="min-h-screen bg-[#f4f6f9]">
        <div className="mx-auto max-w-[1340px] px-6">
          <div className="relative mb-8">
            <div className="rounded-t-[16px] bg-[#07122f] p-6 text-white">
              <div className="mb-4 inline-flex rounded-[8px] bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#24bf7a]">
                Team · Step 02 · Experiment card
              </div>
              <h1 className="max-w-[820px] font-sans text-[52px] font-black leading-[0.98] tracking-normal text-white md:text-[64px]">
                This is not a business case. This is a bet worth taking.
              </h1>
            </div>
            <div className="h-10 bg-gradient-to-b from-[#07122f] to-[#f4f6f9]" />
          </div>
        </div>

        <section className="mx-auto max-w-[1240px] px-8">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-8 lg:col-start-3">
              {/* Mentor Verdict */}
              {evaluation && <MentorVerdictBlock evaluation={evaluation} />}

              {/* Card */}
              <div
                className={`overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${evaluation ? "mt-8" : ""}`}
              >
                {/* Card header */}
                <div className="border-b border-[#f0eeee] px-10 py-8">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">Experiment Card</div>
                  <p className="font-sans text-[28px] font-bold leading-snug text-[#07122f]">{data.problem}</p>
                  <p className="mt-2 text-[14px] font-medium text-[#697081]">Affects: {data.whoHasIt}</p>
                </div>

                {/* Card body */}
                <div className="divide-y divide-[#f0eeee]">
                  <Row label="The one-week experiment" value={data.experiment} />
                  <Row label="Willing to risk" value={data.willingToRisk} />
                  <div className="grid grid-cols-2">
                    <div className="border-r border-[#f0eeee] px-8 py-6">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#08764c]">Go signal</div>
                      <p className="text-[14px] leading-relaxed text-[#07122f]">{data.goSignal}</p>
                    </div>
                    <div className="px-8 py-6">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-red-600">Stop signal</div>
                      <p className="text-[14px] leading-relaxed text-[#07122f]">{data.stopSignal}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit to board */}
              <div className="mt-6 rounded-[16px] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">Submit to Idea Board</div>
                <p className="mb-6 text-[14px] font-medium text-[#697081]">
                  Add your name so the team can see who's running this experiment.
                </p>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your name & role — e.g. Alex P., Frontend Engineer"
                    className="flex-1 rounded-[12px] border border-[#e4e0de] bg-[#f4f6f9] px-4 py-3 text-[14px] font-medium text-[#07122f] outline-none transition-colors focus:border-[#24bf7a] focus:bg-white"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!author.trim() || submitted}
                    className="shrink-0 rounded-[12px] bg-[#24bf7a] px-6 py-3 text-[13px] font-bold tracking-wide text-[#07122f] transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    Submit to Idea Board →
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/team"
                  className="text-[13px] font-medium text-[#697081] underline-offset-4 hover:text-[#07122f] hover:underline"
                >
                  ← Edit answers
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="h-24" />
      </div>
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
              className="h-1.5 w-1.5 rounded-full bg-[#24bf7a]"
              style={{
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <p className="font-sans text-[32px] font-black leading-tight text-[#07122f]">
          Evaluating your idea…
        </p>
        <p className="mt-4 text-[14px] font-medium text-[#697081]">
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
      textColor: "text-[#22c55e]",
      borderColor: "border-[#22c55e]",
      bgColor: "bg-white",
      dotColor: "bg-[#22c55e]",
    },
    pause: {
      label: "Pause",
      textColor: "text-[#f97316]",
      borderColor: "border-[#f97316]",
      bgColor: "bg-white",
      dotColor: "bg-[#f97316]",
    },
    drop: {
      label: "Drop",
      textColor: "text-red-600",
      borderColor: "border-red-400/40",
      bgColor: "bg-red-50/80",
      dotColor: "bg-red-600",
    },
  }[evaluation.verdict];

  const strengthConfig: Record<string, { label: string; color: string }> = {
    strong: { label: "Strong painkiller", color: "text-primary" },
    weak: { label: "Feels like a vitamin", color: "text-[#f97316]" },
    unclear: { label: "Hard to tell", color: "text-muted-foreground" },
  };

  const qualityConfig: Record<string, { label: string; color: string }> = {
    sharp: { label: "Sharp and testable", color: "text-primary" },
    vague: { label: "Too vague to measure", color: "text-[#f97316]" },
    "too big": { label: "Too big for one week", color: "text-destructive" },
  };

  const strength = strengthConfig[evaluation.problemStrength];
  const quality = qualityConfig[evaluation.experimentQuality];

  return (
    <div className={`overflow-hidden rounded-[16px] border-[1.5px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${verdictConfig.bgColor} ${verdictConfig.borderColor}`}>
      {/* Verdict header */}
      <div className="border-b border-black/5 px-10 py-8">
        <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">Mentor Verdict</div>
        <div className="flex items-baseline gap-4">
          <span className={`font-sans text-[52px] font-black leading-none ${verdictConfig.textColor}`}>
            {verdictConfig.label}
          </span>
          <span
            className={`h-2 w-2 shrink-0 translate-y-1 rounded-full ${verdictConfig.dotColor}`}
            aria-hidden
          />
        </div>
        <p className="mt-3 text-[18px] font-medium leading-snug text-[#07122f]/80 italic">
          {evaluation.verdictReason}
        </p>
      </div>

      {/* Signal rows */}
      <div className="divide-y divide-black/5 px-10 py-2">
        <SignalRow label="Problem strength" value={strength.label} valueColor={strength.color} />
        <SignalRow label="Experiment quality" value={quality.label} valueColor={quality.color} />
        <SignalRow
          label="Biggest blindspot"
          value={evaluation.biggestBlindspot}
          valueColor="text-[#07122f]"
        />
      </div>

      {/* Mentor note pull quote */}
      <div className="border-t border-black/5 px-10 py-8">
        <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">Mentor note</div>
        <div className="rounded-[12px] bg-[#f9fafb] px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <p className="text-[16px] font-medium leading-relaxed text-[#07122f]">
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
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">{label}</div>
      <p className="text-[15px] font-medium leading-relaxed text-[#07122f]">{value}</p>
    </div>
  );
}
