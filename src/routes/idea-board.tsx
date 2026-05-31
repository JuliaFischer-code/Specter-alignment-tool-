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
import { downloadManagerBriefPdf } from "@/lib/manager-brief-pdf";

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

// IDs of the pre-computed similar pair
const SIMILAR_IDS = new Set(["mock-1", "mock-2"]);

function IdeaBoardPage() {
  const { ideas, hydrated, addCheckIn } = useIdeas();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "matches">("all");
  const [toastVisible, setToastVisible] = useState(false);

  if (!hydrated) {
    return (
      <AppShell teamMode>
        <div className="mx-auto max-w-[1240px] px-8 py-24 text-center text-muted-foreground">
          Loading…
        </div>
      </AppShell>
    );
  }

  const showToast = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  return (
    <AppShell teamMode>
      <PageHeader
        eyebrow="Team · Step 02 · Idea board"
        title="Active experiments."
        lede="Each card is a bet someone made explicit. Check in weekly. Stop early if the signal isn't there."
        teamStyle
      />

      <section className="mx-auto max-w-[1240px] px-8">
        <ProjectProgressHeader ideas={ideas} />
        <PortfolioSnapshot ideas={ideas} />

        {/* Tabs */}
        <div className="mb-8 flex gap-0 border-b border-border">
          <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>
            All experiments
          </TabButton>
          <TabButton active={activeTab === "matches"} onClick={() => setActiveTab("matches")}>
            Idea Matches
            <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-400/30 font-mono text-[10px] text-amber-700">
              1
            </span>
          </TabButton>
        </div>

        {activeTab === "all" ? (
          <>
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
                    hasSimilar={SIMILAR_IDS.has(idea.id)}
                    expanded={expandedId === idea.id}
                    onToggle={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
                    onCheckIn={(checkIn, newStatus) => addCheckIn(idea.id, checkIn, newStatus)}
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
          </>
        ) : (
          <IdeaMatchesTab ideas={ideas} onConnect={showToast} />
        )}
      </section>

      <div className="h-24" />

      {/* Toast */}
      {toastVisible && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 border border-border bg-card px-6 py-3 text-[13px] text-foreground shadow-lg">
          Feature coming soon: team introductions
        </div>
      )}
    </AppShell>
  );
}

function ProjectProgressHeader({ ideas }: { ideas: IdeaCard[] }) {
  const total = ideas.length;
  const onTrack = ideas.filter((idea) => idea.status.toLowerCase().startsWith("on track")).length;
  const watch = ideas.filter((idea) => idea.status.toLowerCase().startsWith("watch")).length;
  const stopped = ideas.filter((idea) => idea.status.toLowerCase().startsWith("stop")).length;
  const pursue = ideas.filter((idea) => idea.mentorEvaluation?.verdict === "pursue").length;
  const pause = ideas.filter((idea) => idea.mentorEvaluation?.verdict === "pause").length;
  const drop = ideas.filter((idea) => idea.mentorEvaluation?.verdict === "drop").length;
  const onCourse = onTrack + pursue;
  const atRisk = watch + pause;
  const failed = stopped + drop;

  const stats = [
    {
      label: "On expected course",
      value: onCourse,
      detail: `${total > 0 ? Math.round((onCourse / total) * 100) : 0}% of board`,
      tone: "primary" as const,
      trend: [34, 38, 44, 48, 57, 63],
    },
    {
      label: "Needs attention",
      value: atRisk,
      detail: `${watch} watch · ${pause} pause`,
      tone: "watch" as const,
      trend: [22, 28, 25, 34, 32, 37],
    },
    {
      label: "Failed or stopped",
      value: failed,
      detail: `${stopped} stopped · ${drop} dropped`,
      tone: "danger" as const,
      trend: [18, 16, 21, 19, 24, 22],
    },
    {
      label: "Manager briefs",
      value: pursue,
      detail: "Pursue-ready handoffs",
      tone: "neutral" as const,
      trend: [10, 18, 24, 31, 38, 45],
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-4">
      {stats.map((stat) => (
        <ProgressStat key={stat.label} {...stat} />
      ))}
    </div>
  );
}

function ProgressStat({
  label,
  value,
  detail,
  tone,
  trend,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "primary" | "watch" | "danger" | "neutral";
  trend: number[];
}) {
  const toneClass = {
    primary: "text-primary",
    watch: "text-amber-600",
    danger: "text-destructive",
    neutral: "text-foreground",
  }[tone];

  const stroke = {
    primary: "#005c3b",
    watch: "#d79000",
    danger: "#dc2626",
    neutral: "#111827",
  }[tone];

  return (
    <div className="bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className={`mt-3 font-serif text-[38px] leading-none ${toneClass}`}>{value}</div>
        </div>
        <Sparkline values={trend} stroke={stroke} />
      </div>
      <div className="mt-3 text-[12px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 74 + 4;
      const y = 28 - ((value - min) / range) * 20;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 82 32"
      className="h-8 w-[82px] shrink-0"
      role="img"
      aria-label="Progress trend"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <line x1="4" y1="28" x2="78" y2="28" stroke="#d8d4cc" strokeWidth="1" />
    </svg>
  );
}

function PortfolioSnapshot({ ideas }: { ideas: IdeaCard[] }) {
  const total = ideas.length;
  const pursue = ideas.filter((idea) => idea.mentorEvaluation?.verdict === "pursue").length;
  const pause = ideas.filter((idea) => idea.mentorEvaluation?.verdict === "pause").length;
  const drop = ideas.filter((idea) => idea.mentorEvaluation?.verdict === "drop").length;
  const onTrack = ideas.filter((idea) => idea.status.toLowerCase().startsWith("on track")).length;
  const watch = ideas.filter((idea) => idea.status.toLowerCase().startsWith("watch")).length;
  const stopped = ideas.filter((idea) => idea.status.toLowerCase().startsWith("stop")).length;
  const totalCheckIns = ideas.reduce((sum, idea) => sum + idea.checkIns.length, 0);
  const managerBriefsReady = pursue;
  const activeExperiments = Math.max(0, total - stopped);
  const portfolioReadiness = getPortfolioReadiness(ideas);

  const statusSegments = [
    { label: "On track", value: onTrack, className: "bg-primary" },
    { label: "Watch", value: watch, className: "bg-amber-500" },
    { label: "Stopped", value: stopped, className: "bg-destructive" },
  ];

  const pipeline = [
    { label: "Ideas", value: total },
    { label: "Active", value: activeExperiments },
    { label: "Pursue", value: pursue },
    { label: "Briefs", value: managerBriefsReady },
  ];

  return (
    <div className="mb-8 border border-border bg-card">
      <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-[1.35fr_1fr] lg:divide-x lg:divide-y-0">
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow mb-1">Portfolio intelligence</div>
              <p className="text-[12px] text-muted-foreground">
                Team experiments moving toward manager-ready commitments.
              </p>
            </div>
            <span className="border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
              {managerBriefsReady} brief{managerBriefsReady !== 1 ? "s" : ""} ready
            </span>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border md:grid-cols-4">
            <MetricCell label="Experiments" value={total} />
            <MetricCell label="Pursue" value={pursue} tone="primary" />
            <MetricCell label="Pause" value={pause} tone="watch" />
            <MetricCell label="Check-ins" value={totalCheckIns} />
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Status distribution</span>
              <span>
                {onTrack} on track · {watch} watch · {stopped} stopped
              </span>
            </div>
            <StackedBar segments={statusSegments} total={Math.max(1, total)} />
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-border p-0 md:grid-cols-[1fr_220px] md:divide-x md:divide-y-0 lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
          <div className="p-6">
            <div className="eyebrow mb-5">Pipeline</div>
            <div className="space-y-4">
              {pipeline.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">{item.label}</span>
                    <span className="font-mono text-[12px] text-foreground">{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${total > 0 ? Math.max(6, (item.value / total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-px border border-border bg-border">
              <MiniVerdict label="Pursue" value={pursue} className="text-primary" />
              <MiniVerdict label="Pause" value={pause} className="text-amber-600" />
              <MiniVerdict label="Drop" value={drop} className="text-destructive" />
            </div>
          </div>

          <div className="p-6">
            <div className="eyebrow mb-3">Readiness radar</div>
            <ReadinessRadar dimensions={portfolioReadiness} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "primary" | "watch";
}) {
  const toneClass =
    tone === "primary" ? "text-primary" : tone === "watch" ? "text-amber-600" : "text-foreground";

  return (
    <div className="bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-2 font-serif text-[32px] leading-none ${toneClass}`}>{value}</div>
    </div>
  );
}

function StackedBar({
  segments,
  total,
}: {
  segments: { label: string; value: number; className: string }[];
  total: number;
}) {
  return (
    <div className="flex h-2 overflow-hidden bg-muted" aria-label="Status distribution">
      {segments.map((segment) => {
        if (segment.value === 0) return null;
        return (
          <div
            key={segment.label}
            className={segment.className}
            title={`${segment.label}: ${segment.value}`}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        );
      })}
    </div>
  );
}

function MiniVerdict({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="bg-card p-3 text-center">
      <div className={`font-mono text-[16px] leading-none ${className}`}>{value}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1 px-5 py-3 font-mono text-[11px] uppercase tracking-wider transition-colors " +
        (active
          ? "border-b-2 border-foreground text-foreground"
          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function IdeaMatchesTab({ ideas, onConnect }: { ideas: IdeaCard[]; onConnect: () => void }) {
  const lena = ideas.find((i) => i.id === "mock-1");
  const jonas = ideas.find((i) => i.id === "mock-2");

  if (!lena || !jonas) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p>No matches detected yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-[12px] text-muted-foreground">
        1 potential collaboration detected across active experiments.
      </p>

      {/* Match card */}
      <div className="border border-dashed border-amber-400/60 bg-amber-50/30">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-amber-400/30 px-8 py-4">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-wider text-amber-700">
            Potential collaboration found
          </span>
        </div>

        {/* Two ideas side by side */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]">
          <MatchIdeaSummary idea={lena} />

          {/* Center connector */}
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 md:border-x md:border-amber-400/20">
            <div className="hidden h-px w-8 bg-amber-400/40 md:block" />
            <span className="max-w-[120px] text-center font-mono text-[10px] uppercase tracking-wider text-amber-600">
              Both tackling signal-to-noise in engineering ops
            </span>
            <div className="hidden h-px w-8 bg-amber-400/40 md:block" />
          </div>

          <MatchIdeaSummary idea={jonas} />
        </div>

        {/* AI insight block */}
        <div className="border-t border-amber-400/30 bg-amber-50/40 px-8 py-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-amber-700">
            AI insight
          </div>
          <p className="text-[13px] leading-relaxed text-foreground">
            These experiments are testing the same hypothesis from different angles — alert noise
            vs. metric noise. Running them in parallel risks duplication. Consider: one team owns
            the problem, the other contributes findings. Suggested owner: whoever has more on-call
            exposure.
          </p>
        </div>

        {/* Action row */}
        <div className="border-t border-amber-400/30 px-8 py-5">
          <button
            onClick={onConnect}
            className="border border-amber-500/60 bg-amber-400/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-wider text-amber-700 transition-colors hover:bg-amber-400/20"
          >
            Connect these teams →
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchIdeaSummary({ idea }: { idea: IdeaCard }) {
  return (
    <div className="px-8 py-6">
      <p className="mb-1 text-[11px] text-muted-foreground">{idea.author}</p>
      <p className="mb-3 text-[14px] font-medium leading-snug text-foreground">{idea.problem}</p>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/60">
          Experiment:{" "}
        </span>
        {idea.experiment}
      </p>
    </div>
  );
}

function IdeaRow({
  idea,
  hasSimilar,
  expanded,
  onToggle,
  onCheckIn,
}: {
  idea: IdeaCard;
  hasSimilar: boolean;
  expanded: boolean;
  onToggle: () => void;
  onCheckIn: (checkIn: TeamCheckIn, newStatus: string) => void;
}) {
  const canCreateManagerBrief = idea.mentorEvaluation?.verdict === "pursue";

  return (
    <div className="border border-dashed border-border bg-card">
      {/* Summary row */}
      <div className="flex items-start gap-6 px-8 py-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span
              className={"h-1.5 w-1.5 shrink-0 rounded-full " + getStatusDotColor(idea.status)}
              aria-hidden
            />
            <span
              className={
                "font-mono text-[11px] uppercase tracking-wider " + getStatusColor(idea.status)
              }
            >
              {idea.status}
            </span>
            <span className="text-[11px] text-muted-foreground">
              · {idea.checkIns.length} check-in{idea.checkIns.length !== 1 ? "s" : ""}
            </span>
            {hasSimilar && (
              <span className="font-mono text-[10px] text-amber-600">· Similar idea on board</span>
            )}
            {idea.mentorEvaluation && <VerdictBadge verdict={idea.mentorEvaluation.verdict} />}
          </div>
          <p className="text-[15px] font-medium leading-snug text-foreground">{idea.problem}</p>
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
              <p className="text-[13px] leading-relaxed text-foreground">{idea.goSignal}</p>
            </div>
            <div className="px-8 py-5">
              <div className="eyebrow mb-1 text-destructive">Stop signal</div>
              <p className="text-[13px] leading-relaxed text-foreground">{idea.stopSignal}</p>
            </div>
          </div>

          {canCreateManagerBrief && <ReadinessProfile idea={idea} />}

          {canCreateManagerBrief && (
            <div className="border-t border-border bg-primary/5 px-8 py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="eyebrow mb-1 text-primary">Manager handoff</div>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    Create a pilot brief that answers the nine manager intake questions.
                  </p>
                </div>
                <button
                  onClick={() => downloadManagerBriefPdf(idea)}
                  className="shrink-0 border border-primary/40 bg-card px-5 py-2.5 font-mono text-[11px] uppercase tracking-wider text-primary transition-colors hover:bg-accent"
                >
                  Download manager brief PDF
                </button>
              </div>
            </div>
          )}

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

type ReadinessDimension = {
  label: string;
  value: number;
  status: string;
  note: string;
};

function getPortfolioReadiness(ideas: IdeaCard[]): ReadinessDimension[] {
  const scoredIdeas = ideas.filter((idea) => idea.mentorEvaluation);
  const sourceIdeas = scoredIdeas.length > 0 ? scoredIdeas : ideas;
  const fallback = sourceIdeas[0];

  if (!fallback) {
    return [
      {
        label: "Problem strength",
        value: 50,
        status: "Mock",
        note: "No experiments yet.",
      },
      {
        label: "Experiment design",
        value: 50,
        status: "Mock",
        note: "No experiments yet.",
      },
      {
        label: "Evidence",
        value: 30,
        status: "Mock",
        note: "No experiments yet.",
      },
      {
        label: "Risk control",
        value: 45,
        status: "Mock",
        note: "No experiments yet.",
      },
      {
        label: "Manager readiness",
        value: 40,
        status: "Mock",
        note: "No experiments yet.",
      },
    ];
  }

  const dimensionSets = sourceIdeas.map(getReadinessDimensions);

  return dimensionSets[0].map((dimension, index) => ({
    ...dimension,
    value: Math.round(
      dimensionSets.reduce((sum, set) => sum + set[index].value, 0) / dimensionSets.length,
    ),
    status: "Portfolio avg.",
    note: "Average across evaluated experiments.",
  }));
}

function getReadinessDimensions(idea: IdeaCard): ReadinessDimension[] {
  const evaluation = idea.mentorEvaluation;
  const latestDecision = idea.checkIns.at(-1)?.decision;
  const hasCheckIns = idea.checkIns.length > 0;

  return [
    {
      label: "Problem strength",
      value: evaluation?.problemStrength === "strong" ? 88 : 58,
      status: evaluation?.problemStrength === "strong" ? "Strong" : "Needs proof",
      note:
        evaluation?.problemStrength === "strong"
          ? "Repeated pain with a clear owner."
          : "Pain is plausible, but the audience needs sharper evidence.",
    },
    {
      label: "Experiment design",
      value: evaluation?.experimentQuality === "sharp" ? 86 : 56,
      status: evaluation?.experimentQuality === "sharp" ? "Sharp" : "Loose",
      note:
        evaluation?.experimentQuality === "sharp"
          ? "Small enough to test, specific enough to learn."
          : "The test should be narrowed before scaling.",
    },
    {
      label: "Evidence",
      value: hasCheckIns ? (latestDecision === "continue" ? 72 : 58) : 38,
      status: hasCheckIns ? "Emerging" : "Thin",
      note: hasCheckIns
        ? `${idea.checkIns.length} check-in${idea.checkIns.length !== 1 ? "s" : ""} recorded.`
        : "No weekly learning has been recorded yet.",
    },
    {
      label: "Risk control",
      value: idea.stopSignal ? 74 : 42,
      status: idea.stopSignal ? "Guarded" : "Unclear",
      note: idea.stopSignal
        ? "A stop condition is written before the team is attached."
        : "Needs an explicit stop condition.",
    },
    {
      label: "Manager readiness",
      value: evaluation?.verdict === "pursue" ? 82 : 52,
      status: evaluation?.verdict === "pursue" ? "Ready" : "Review",
      note:
        evaluation?.verdict === "pursue"
          ? "Ready to become a manager-facing commitment brief."
          : "Needs refinement before manager handoff.",
    },
  ];
}

function getInnovationFocus(idea: IdeaCard) {
  const text = `${idea.problem} ${idea.experiment} ${idea.goSignal}`.toLowerCase();
  const focus: string[] = [];

  if (/(alert|incident|on-call|crash|failure|triage|monitor)/.test(text)) {
    focus.push("Engineering operations");
  }
  if (/(time|hours|minutes|faster|drops|reduce|reduction)/.test(text)) {
    focus.push("Cycle-time reduction");
  }
  if (/(accuracy|wrong|false|quality|correct)/.test(text)) {
    focus.push("Quality control");
  }
  if (/(dashboard|metrics|signal|noise)/.test(text)) {
    focus.push("Signal clarity");
  }

  return focus.slice(0, 3);
}

function ReadinessProfile({ idea }: { idea: IdeaCard }) {
  const dimensions = getReadinessDimensions(idea);
  const focus = getInnovationFocus(idea);
  const average = Math.round(
    dimensions.reduce((sum, dimension) => sum + dimension.value, 0) / dimensions.length,
  );

  return (
    <div className="border-t border-border px-8 py-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="eyebrow mb-1">Innovation readiness profile</div>
          <p className="max-w-[640px] text-[13px] leading-relaxed text-muted-foreground">
            Assessment derived from mentor evaluation, experiment shape, risk guardrails, and
            check-in evidence.
          </p>
        </div>
        <div className="border border-border bg-background px-4 py-3 text-right">
          <div className="font-serif text-[30px] leading-none text-primary">{average}</div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Readiness
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-3">
          {dimensions.map((dimension) => (
            <ReadinessRow key={dimension.label} dimension={dimension} />
          ))}
        </div>

        <div className="border border-border bg-muted/20 p-5">
          <div className="mb-5">
            <div className="eyebrow mb-3">Readiness radar</div>
            <ReadinessRadar dimensions={dimensions} />
          </div>

          <div className="eyebrow mb-3">Innovation focus</div>
          <div className="flex flex-wrap gap-2">
            {focus.length > 0 ? (
              focus.map((item) => (
                <span
                  key={item}
                  className="border border-primary/30 bg-primary/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary"
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-[12px] text-muted-foreground">Focus still emerging</span>
            )}
          </div>

          {idea.mentorEvaluation?.biggestBlindspot && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="eyebrow mb-2 text-amber-600">Watch item</div>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {idea.mentorEvaluation.biggestBlindspot}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReadinessRadar({
  dimensions,
  compact = false,
}: {
  dimensions: ReadinessDimension[];
  compact?: boolean;
}) {
  const size = compact ? 180 : 220;
  const center = size / 2;
  const radius = compact ? 58 : 72;
  const labelRadius = compact ? 78 : 96;
  const shortLabels = dimensions.map((dimension) =>
    dimension.label
      .replace("Problem strength", "Problem")
      .replace("Experiment design", "Experiment")
      .replace("Risk control", "Risk")
      .replace("Manager readiness", "Manager"),
  );

  const getPoint = (index: number, value: number, pointRadius = radius) => {
    const angle = -Math.PI / 2 + (index / dimensions.length) * Math.PI * 2;
    const scaledRadius = pointRadius * (value / 100);
    return {
      x: center + Math.cos(angle) * scaledRadius,
      y: center + Math.sin(angle) * scaledRadius,
    };
  };

  const polygon = dimensions
    .map((dimension, index) => {
      const point = getPoint(index, dimension.value);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={compact ? "h-[180px] w-[180px]" : "h-[220px] w-[220px]"}
        role="img"
        aria-label="Readiness radar chart"
      >
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={dimensions
              .map((_, index) => {
                const point = getPoint(index, level, radius);
                return `${point.x},${point.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#d8d4cc"
            strokeDasharray={level === 100 ? "0" : "2 3"}
            strokeWidth="1"
          />
        ))}

        {dimensions.map((_, index) => {
          const edge = getPoint(index, 100, radius);
          const labelPoint = getPoint(index, 100, labelRadius);
          return (
            <g key={shortLabels[index]}>
              <line x1={center} y1={center} x2={edge.x} y2={edge.y} stroke="#d8d4cc" />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground font-mono text-[8px] uppercase tracking-wider"
              >
                {shortLabels[index]}
              </text>
            </g>
          );
        })}

        <polygon
          points={polygon}
          fill="#005c3b"
          fillOpacity="0.18"
          stroke="#005c3b"
          strokeWidth="2"
        />
        {dimensions.map((dimension, index) => {
          const point = getPoint(index, dimension.value);
          return (
            <g key={dimension.label}>
              <circle cx={point.x} cy={point.y} r="3" fill="#005c3b" />
              {!compact && (
                <text
                  x={point.x}
                  y={point.y - 8}
                  textAnchor="middle"
                  className="fill-primary font-mono text-[9px]"
                >
                  {dimension.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ReadinessRow({ dimension }: { dimension: ReadinessDimension }) {
  const barClass =
    dimension.value >= 80
      ? "bg-primary"
      : dimension.value >= 65
        ? "bg-amber-500"
        : "bg-destructive";

  return (
    <div className="grid gap-2 md:grid-cols-[170px_1fr_92px] md:items-center">
      <div>
        <div className="text-[13px] text-foreground">{dimension.label}</div>
        <div className="text-[11px] text-muted-foreground">{dimension.status}</div>
      </div>
      <div>
        <div className="h-1.5 bg-muted">
          <div className={`h-full ${barClass}`} style={{ width: `${dimension.value}%` }} />
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{dimension.note}</p>
      </div>
      <div className="font-mono text-[12px] text-muted-foreground md:text-right">
        {dimension.value}/100
      </div>
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
              {
                value: "continue" as const,
                label: "Continue →",
                active: "bg-primary text-primary-foreground",
                inactive: "border-border text-foreground hover:border-foreground/60",
              },
              {
                value: "pause" as const,
                label: "Pause ⏸",
                active: "bg-amber-500 text-white",
                inactive: "border-border text-foreground hover:border-foreground/60",
              },
              {
                value: "stop" as const,
                label: "Stop ✕",
                active: "bg-destructive text-destructive-foreground",
                inactive: "border-border text-foreground hover:border-foreground/60",
              },
            ] satisfies {
              value: TeamCheckIn["decision"];
              label: string;
              active: string;
              inactive: string;
            }[]
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDecision(opt.value)}
              className={
                "border px-4 py-2 text-[13px] font-medium transition-colors " +
                (decision === opt.value
                  ? opt.active + " border-transparent"
                  : "border " + opt.inactive)
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
