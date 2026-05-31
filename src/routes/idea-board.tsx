import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  useIdeas,
  getStatusColor,
  getStatusDotColor,
  getNewStatus,
  type IdeaCard,
  type TeamCheckIn,
  type MentorEvaluation,
} from "@/lib/team-store";

export const Route = createFileRoute("/idea-board")({
  head: () => ({
    meta: [
      { title: "Idea Board — Uncertainty Navigator" },
      {
        name: "description",
        content: "Active experiments from the team.",
      },
    ],
  }),
  component: IdeaBoardPage,
});

function IdeaBoardPage() {
  const { ideas, hydrated, addCheckIn } = useIdeas();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <AppShell teamMode>
        <div className="mx-auto max-w-[1240px] px-8 py-24 text-center text-muted-foreground">
          Loading…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell teamMode>
      <PageHeader
        eyebrow="Team · Step 02 · Idea board"
        title="Active experiments."
        lede="Each card is a bet someone made explicit. Check in weekly. Stop early if the signal isn't there."
        teamStyle
      />

      <section className="mx-auto max-w-[1240px] px-8">
        {ideas.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>No experiments yet.</p>
            <Link
              to="/team"
              className="mt-4 inline-block text-[13px] text-foreground underline underline-offset-4"
            >
              Start the first one →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ideas.map((idea) => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                expanded={expandedId === idea.id}
                onToggle={() =>
                  setExpandedId(expandedId === idea.id ? null : idea.id)
                }
                onCheckIn={(checkIn, newStatus) =>
                  addCheckIn(idea.id, checkIn, newStatus)
                }
              />
            ))}
          </div>
        )}

        <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
          <span className="text-[12px] text-muted-foreground">
            {ideas.length} experiment{ideas.length !== 1 ? "s" : ""} on the board
          </span>
          <Link
            to="/team"
            className="bg-primary px-5 py-2.5 text-[13px] font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
          >
            + Add experiment
          </Link>
        </div>
      </section>

      <div className="h-24" />
    </AppShell>
  );
}

function IdeaRow({
  idea,
  expanded,
  onToggle,
  onCheckIn,
}: {
  idea: IdeaCard;
  expanded: boolean;
  onToggle: () => void;
  onCheckIn: (checkIn: TeamCheckIn, newStatus: string) => void;
}) {
  return (
    <div className="border border-dashed border-border bg-card">
      {/* Summary row */}
      <div className="flex items-start gap-6 px-8 py-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span
              className={
                "h-1.5 w-1.5 shrink-0 rounded-full " + getStatusDotColor(idea.status)
              }
              aria-hidden
            />
            <span
              className={
                "font-mono text-[11px] uppercase tracking-wider " +
                getStatusColor(idea.status)
              }
            >
              {idea.status}
            </span>
            <span className="text-[11px] text-muted-foreground">
              · {idea.checkIns.length} check-in{idea.checkIns.length !== 1 ? "s" : ""}
            </span>
            {idea.mentorEvaluation && (
              <VerdictBadge verdict={idea.mentorEvaluation.verdict} />
            )}
          </div>
          <p className="text-[15px] font-medium leading-snug text-foreground">
            {idea.problem}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">{idea.author}</p>
        </div>
        <button
          onClick={onToggle}
          className="shrink-0 border border-border px-4 py-2 text-[12px] font-mono uppercase tracking-wider text-foreground transition-colors hover:border-foreground/60"
        >
          {expanded ? "Collapse" : "View + Check in"}
        </button>
      </div>

      {/* Expanded detail + check-in */}
      {expanded && (
        <div className="border-t border-border">
          {/* Full card details */}
          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
            <DetailBlock label="The one-week experiment" value={idea.experiment} />
            <DetailBlock label="Willing to risk" value={idea.willingToRisk} />
          </div>
          <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
            <div className="px-8 py-5">
              <div className="eyebrow mb-1 text-primary">Go signal</div>
              <p className="text-[13px] leading-relaxed text-foreground">
                {idea.goSignal}
              </p>
            </div>
            <div className="px-8 py-5">
              <div className="eyebrow mb-1 text-destructive">Stop signal</div>
              <p className="text-[13px] leading-relaxed text-foreground">
                {idea.stopSignal}
              </p>
            </div>
          </div>

          {/* Check-in history */}
          {idea.checkIns.length > 0 && (
            <div className="border-t border-border px-8 py-6">
              <div className="eyebrow mb-4">Check-in history</div>
              <ol className="space-y-4">
                {idea.checkIns.map((ci) => (
                  <CheckInHistoryItem key={ci.id} checkIn={ci} />
                ))}
              </ol>
            </div>
          )}

          {/* New check-in form */}
          <CheckInForm
            idea={idea}
            onSubmit={(checkIn, newStatus) => onCheckIn(checkIn, newStatus)}
          />
        </div>
      )}
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: MentorEvaluation["verdict"] }) {
  const config = {
    pursue: { label: "Pursue", className: "text-primary border-primary/40 bg-accent" },
    pause: { label: "Pause", className: "text-amber-600 border-amber-400/40 bg-amber-50/60" },
    drop: { label: "Drop", className: "text-destructive border-destructive/30 bg-destructive/5" },
  }[verdict];

  return (
    <span
      className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-8 py-5">
      <div className="eyebrow mb-1">{label}</div>
      <p className="text-[13px] leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

function CheckInHistoryItem({ checkIn }: { checkIn: TeamCheckIn }) {
  const decisionLabel = {
    continue: "Continue →",
    pause: "Pause ⏸",
    stop: "Stop ✕",
  }[checkIn.decision];

  const decisionColor = {
    continue: "text-primary",
    pause: "text-amber-600",
    stop: "text-destructive",
  }[checkIn.decision];

  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-border mt-1.5" aria-hidden />
        <span className="w-px flex-1 bg-border" aria-hidden />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-[11px] text-muted-foreground">
            {format(new Date(checkIn.createdAt), "d MMM yyyy")}
          </span>
          <span className={`font-mono text-[11px] uppercase tracking-wider ${decisionColor}`}>
            {decisionLabel}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-foreground">{checkIn.learning}</p>
      </div>
    </li>
  );
}

function CheckInForm({
  idea,
  onSubmit,
}: {
  idea: IdeaCard;
  onSubmit: (checkIn: TeamCheckIn, newStatus: string) => void;
}) {
  const [learning, setLearning] = useState("");
  const [decision, setDecision] = useState<TeamCheckIn["decision"] | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = () => {
    if (!learning.trim() || !decision) return;
    const checkIn: TeamCheckIn = {
      id: `ci-${Date.now()}`,
      createdAt: new Date().toISOString(),
      learning: learning.trim(),
      decision,
    };
    const newStatus = getNewStatus(decision, idea.createdAt);
    onSubmit(checkIn, newStatus);
    setSaved(true);
    setLearning("");
    setDecision(null);
  };

  if (saved) {
    return (
      <div className="border-t border-border bg-background px-8 py-6">
        <p className="text-[13px] text-muted-foreground">
          Check-in saved.{" "}
          <button
            onClick={() => setSaved(false)}
            className="text-foreground underline underline-offset-4"
          >
            Add another
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-background px-8 py-6">
      <div className="eyebrow mb-4">This week's check-in</div>

      <label className="block">
        <span className="mb-2 block text-[13px] text-muted-foreground">
          What did you learn this week?
        </span>
        <textarea
          value={learning}
          onChange={(e) => setLearning(e.target.value)}
          placeholder="One honest observation about what the experiment revealed."
          rows={3}
          className="w-full resize-none border border-border bg-card px-4 py-3 text-[14px] leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
        />
      </label>

      <div className="mt-4">
        <span className="mb-3 block text-[13px] text-muted-foreground">Decision</span>
        <div className="flex gap-2">
          {(
            [
              { value: "continue" as const, label: "Continue →", active: "bg-primary text-primary-foreground", inactive: "border-border text-foreground hover:border-foreground/60" },
              { value: "pause" as const, label: "Pause ⏸", active: "bg-amber-500 text-white", inactive: "border-border text-foreground hover:border-foreground/60" },
              { value: "stop" as const, label: "Stop ✕", active: "bg-destructive text-destructive-foreground", inactive: "border-border text-foreground hover:border-foreground/60" },
            ] satisfies { value: TeamCheckIn["decision"]; label: string; active: string; inactive: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDecision(opt.value)}
              className={
                "border px-4 py-2 text-[13px] font-medium transition-colors " +
                (decision === opt.value ? opt.active + " border-transparent" : "border " + opt.inactive)
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={!learning.trim() || !decision}
          className="bg-primary px-6 py-2.5 text-[13px] font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Save check-in
        </button>
      </div>
    </div>
  );
}
