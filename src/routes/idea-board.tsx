import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageSquare,
  PanelsTopLeft,
  Plus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
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
      { title: "Idea Board — Specter" },
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
      <div className="min-h-screen bg-[#f4f6f9]">
        <div className="mx-auto max-w-[1340px] px-6 pb-8">
          <div className="relative mb-6">
            <DashboardHero ideas={ideas} />
            <div className="h-10 bg-gradient-to-b from-[#07122f] to-[#f4f6f9]" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <IdeaBoardSidebar ideas={ideas} />

            <div className="min-w-0">
              <ProjectProgressHeader ideas={ideas} />
              <PortfolioSnapshot ideas={ideas} />

              <div className="mb-6 flex flex-col gap-3 rounded-[12px] bg-white p-2 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>
                    All experiments
                  </TabButton>
                  <TabButton
                    active={activeTab === "matches"}
                    onClick={() => setActiveTab("matches")}
                  >
                    Idea Matches
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] bg-[#dff5eb] px-1.5 font-mono text-[10px] text-[#24bf7a]">
                      1
                    </span>
                  </TabButton>
                </div>
                <Link
                  to="/team"
                  className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#24bf7a] px-4 py-2.5 text-[13px] font-semibold text-[#07122f] transition-transform hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />
                  Add experiment
                </Link>
              </div>

              {activeTab === "all" ? (
                <>
                  {ideas.length === 0 ? (
                    <div className="rounded-[12px] bg-white py-16 text-center text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                      <p>No experiments yet.</p>
                      <Link
                        to="/team"
                        className="mt-4 inline-block text-[13px] text-[#07122f] underline underline-offset-4"
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
                          onCheckIn={(checkIn, newStatus) =>
                            addCheckIn(idea.id, checkIn, newStatus)
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <IdeaMatchesTab ideas={ideas} onConnect={showToast} />
              )}
            </div>
          </div>
        </div>

        {/* Toast */}
        {toastVisible && (
          <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-[12px] bg-white px-6 py-3 text-[13px] font-medium text-[#07122f] shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            Feature coming soon: team introductions
          </div>
        )}
      </div>
    </AppShell>
  );
}

function IdeaBoardSidebar({ ideas }: { ideas: IdeaCard[] }) {
  const total = ideas.length;
  const pursue = ideas.filter((idea) => idea.mentorEvaluation?.verdict === "pursue").length;
  const active = ideas.filter((idea) => !idea.status.toLowerCase().startsWith("stop")).length;

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "Experiments", icon: PanelsTopLeft },
    { label: "Manager briefs", icon: FileText },
    { label: "Team signals", icon: Users },
    { label: "Check-ins", icon: ClipboardCheck },
    { label: "Comments", icon: MessageSquare },
  ];

  return (
    <aside className="h-fit rounded-[16px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] lg:sticky lg:top-8">
      <div className="mb-5 flex items-center gap-4 lg:mb-8">
        <SpecterWorkspaceMark />
        <div>
          <div className="font-serif text-[24px] font-bold tracking-normal text-[#07122f]">
            Specter
          </div>
          <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#24bf7a]">
            Know where the line is
          </div>
        </div>
      </div>

      <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
        Workspace
      </div>
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:block lg:space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={
                "flex w-full items-center gap-4 rounded-[12px] px-4 py-3 text-left text-[15px] font-semibold transition-colors " +
                (item.active
                  ? "bg-[#f4f6f9] text-[#07122f]"
                  : "text-[#697081] hover:bg-[#f4f6f9]/80 hover:text-[#07122f]")
              }
            >
              <Icon className={item.active ? "h-5 w-5 text-[#24bf7a]" : "h-5 w-5"} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 hidden rounded-[16px] bg-[#07122f] p-4 text-white lg:block">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#24bf7a]" />
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/60">
            Portfolio
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SidebarMetric label="Active" value={active} />
          <SidebarMetric label="Pursue" value={pursue} />
          <SidebarMetric label="Total" value={total} />
          <SidebarMetric
            label="Ready"
            value={total > 0 ? `${Math.round((pursue / total) * 100)}%` : "0%"}
          />
        </div>
      </div>
    </aside>
  );
}

function SidebarMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-[22px] font-bold leading-none text-white">{value}</div>
      <div className="mt-1 text-[11px] font-medium text-white/55">{label}</div>
    </div>
  );
}

function SpecterWorkspaceMark() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-[12px] bg-[#07122f]">
      <svg viewBox="0 0 64 64" className="h-11 w-11" role="img" aria-label="Specter logo">
        <circle cx="32" cy="32" r="25" fill="none" stroke="#17345d" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="16" fill="none" stroke="#24bf7a" strokeWidth="3" />
        <circle cx="32" cy="32" r="7" fill="none" stroke="#24bf7a" strokeWidth="3" />
        <ellipse
          cx="32"
          cy="32"
          rx="29"
          ry="11"
          fill="none"
          stroke="#24bf7a"
          strokeWidth="2"
          transform="rotate(-16 32 32)"
        />
        <ellipse
          cx="32"
          cy="32"
          rx="28"
          ry="17"
          fill="none"
          stroke="#17345d"
          strokeOpacity="0.85"
          strokeWidth="1.5"
          transform="rotate(24 32 32)"
        />
        <line x1="11" y1="32" x2="53" y2="32" stroke="#24bf7a" strokeWidth="2" />
        <line x1="32" y1="11" x2="32" y2="53" stroke="#24bf7a" strokeWidth="2" />
        <circle cx="32" cy="32" r="3" fill="#24bf7a" />
      </svg>
    </div>
  );
}

function DashboardHero({ ideas }: { ideas: IdeaCard[] }) {
  const checkedIn = ideas.reduce((sum, idea) => sum + idea.checkIns.length, 0);

  return (
    <div className="grid grid-cols-1 gap-5 rounded-t-[16px] bg-[#07122f] p-6 text-white xl:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-4 inline-flex rounded-[8px] bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#24bf7a]">
          Team · Step 02 · Idea board
        </div>
        <h1 className="max-w-[760px] font-sans text-[52px] font-black leading-[0.98] tracking-normal text-white md:text-[72px]">
          Active experiment portfolio
        </h1>
        <p className="mt-5 max-w-[620px] text-[16px] leading-relaxed text-white/70">
          Each card is a small bet with a weekly signal, a stop rule, and a manager-ready handoff
          when the evidence turns green.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 self-end">
        <HeroStat label="Experiments" value={ideas.length} />
        <HeroStat label="Check-ins" value={checkedIn} />
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] bg-white p-4 text-[#07122f]">
      <div className="text-[34px] font-black leading-none">{value}</div>
      <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d93a1]">
        {label}
      </div>
    </div>
  );
}

function ProjectProgressHeader({ ideas }: { ideas: IdeaCard[] }) {
  const total = ideas.length;
  const pursue = ideas.filter((idea) => idea.mentorEvaluation?.verdict === "pursue").length;
  const pause = ideas.filter(
    (idea) =>
      idea.status.toLowerCase().startsWith("watch") || idea.mentorEvaluation?.verdict === "pause",
  ).length;
  const failed = ideas.filter(
    (idea) =>
      idea.status.toLowerCase().startsWith("stop") || idea.mentorEvaluation?.verdict === "drop",
  ).length;
  const onCourse = ideas.filter(
    (idea) =>
      idea.status.toLowerCase().startsWith("on track") ||
      idea.mentorEvaluation?.verdict === "pursue",
  ).length;

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
      value: pause,
      detail: `${total > 0 ? Math.round((pause / total) * 100) : 0}% of board`,
      tone: "watch" as const,
      trend: [22, 28, 25, 34, 32, 37],
    },
    {
      label: "Failed or stopped",
      value: failed,
      detail: `${total > 0 ? Math.round((failed / total) * 100) : 0}% of board`,
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
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
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
    <div className="rounded-[12px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
            {label}
          </div>
          <div className={`mt-3 text-[40px] font-black leading-none ${toneClass}`}>{value}</div>
        </div>
        <Sparkline values={trend} stroke={stroke} />
      </div>
      <div className="mt-3 text-[12px] font-medium text-[#697081]">{detail}</div>
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
      <line x1="4" y1="28" x2="78" y2="28" stroke="#ece8e6" strokeWidth="1" />
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
    <div className="mb-6 rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr]">
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="mb-1 text-[12px] font-bold uppercase tracking-[0.16em] text-[#a1a6b3]">
                Portfolio intelligence
              </div>
              <p className="text-[13px] font-medium text-[#697081]">
                Team experiments moving toward manager-ready commitments.
              </p>
            </div>
            <span className="rounded-[8px] bg-[#dff5eb] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#08764c]">
              {managerBriefsReady} brief{managerBriefsReady !== 1 ? "s" : ""} ready
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCell label="Experiments" value={total} />
            <MetricCell label="Pursue" value={pursue} tone="primary" />
            <MetricCell label="Pause" value={pause} tone="watch" />
            <MetricCell label="Check-ins" value={totalCheckIns} />
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-[#697081]">
              <span>Status distribution</span>
              <span>
                {onTrack} on track · {watch} watch · {stopped} stopped
              </span>
            </div>
            <StackedBar segments={statusSegments} total={Math.max(1, total)} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
            <OutcomeDonut pursue={pursue} pause={pause} drop={drop} total={Math.max(1, total)} />
            <div className="rounded-[12px] bg-[#f4f6f9] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
                Outcome ratio
              </div>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#697081]">
                Shows how much of the current board is ready to hand off, paused for more evidence,
                or stopped because the signal crossed the line.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniVerdict label="Pursue" value={pursue} className="text-primary" />
                <MiniVerdict label="Pause" value={pause} className="text-amber-600" />
                <MiniVerdict label="Drop" value={drop} className="text-destructive" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 border-t border-[#f0eeee] p-0 md:grid-cols-[1fr_220px] md:border-l md:border-t-0 lg:grid-cols-1 lg:border-l-0 lg:border-t">
          <div className="p-6">
            <div className="mb-5 text-[12px] font-bold uppercase tracking-[0.16em] text-[#a1a6b3]">
              Pipeline
            </div>
            <div className="space-y-4">
              {pipeline.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[#697081]">{item.label}</span>
                    <span className="text-[12px] font-bold text-[#07122f]">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f0eeee]">
                    <div
                      className="h-full rounded-full bg-[#24bf7a]"
                      style={{
                        width: `${total > 0 ? Math.max(6, (item.value / total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <MiniVerdict label="Pursue" value={pursue} className="text-primary" />
              <MiniVerdict label="Pause" value={pause} className="text-amber-600" />
              <MiniVerdict label="Drop" value={drop} className="text-destructive" />
            </div>
          </div>

          <div className="p-6">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-[#a1a6b3]">
              Readiness radar
            </div>
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
    <div className="rounded-[12px] bg-[#f4f6f9] p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
        {label}
      </div>
      <div className={`mt-2 text-[34px] font-black leading-none ${toneClass}`}>{value}</div>
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
    <div
      className="flex h-3 overflow-hidden rounded-full bg-[#f0eeee]"
      aria-label="Status distribution"
    >
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

function OutcomeDonut({
  pursue,
  pause,
  drop,
  total,
}: {
  pursue: number;
  pause: number;
  drop: number;
  total: number;
}) {
  const pursueDeg = (pursue / total) * 360;
  const pauseDeg = (pause / total) * 360;
  const dropDeg = (drop / total) * 360;
  const readyRate = Math.round((pursue / total) * 100);

  return (
    <div className="flex items-center justify-center rounded-[12px] bg-[#f4f6f9] p-4">
      <div
        className="relative h-32 w-32 rounded-full"
        style={{
          background: `conic-gradient(#005c3b 0deg ${pursueDeg}deg, #d79000 ${pursueDeg}deg ${
            pursueDeg + pauseDeg
          }deg, #dc2626 ${pursueDeg + pauseDeg}deg ${
            pursueDeg + pauseDeg + dropDeg
          }deg, #e4e0de ${pursueDeg + pauseDeg + dropDeg}deg 360deg)`,
        }}
        role="img"
        aria-label={`${readyRate}% of experiments are pursue-ready`}
      >
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
          <div className="text-[24px] font-black leading-none text-[#07122f]">{readyRate}%</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
            ready
          </div>
        </div>
      </div>
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
    <div className="rounded-[12px] bg-[#f4f6f9] p-3 text-center">
      <div className={`text-[18px] font-black leading-none ${className}`}>{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
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
        "flex items-center gap-1 rounded-[10px] px-4 py-2.5 text-[13px] font-bold transition-colors " +
        (active
          ? "bg-[#07122f] text-white"
          : "text-[#697081] hover:bg-[#f4f2f3] hover:text-[#07122f]")
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
      <p className="text-[13px] font-medium text-[#697081]">
        1 potential collaboration detected across active experiments.
      </p>

      {/* Match card */}
      <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#f0eeee] px-8 py-4">
          <span className="h-2 w-2 rounded-full bg-[#d79000]" aria-hidden />
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#b57400]">
            Potential collaboration found
          </span>
        </div>

        {/* Two ideas side by side */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]">
          <MatchIdeaSummary idea={lena} />

          {/* Center connector */}
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 md:border-x md:border-[#f0eeee]">
            <div className="hidden h-px w-8 bg-[#d79000]/40 md:block" />
            <span className="max-w-[120px] text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#b57400]">
              Both tackling signal-to-noise in engineering ops
            </span>
            <div className="hidden h-px w-8 bg-[#d79000]/40 md:block" />
          </div>

          <MatchIdeaSummary idea={jonas} />
        </div>

        {/* AI insight block */}
        <div className="border-t border-[#f0eeee] bg-[#fff8e8] px-8 py-5">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#b57400]">
            AI insight
          </div>
          <p className="text-[13px] font-medium leading-relaxed text-[#07122f]">
            These experiments are testing the same hypothesis from different angles — alert noise
            vs. metric noise. Running them in parallel risks duplication. Consider: one team owns
            the problem, the other contributes findings. Suggested owner: whoever has more on-call
            exposure.
          </p>
        </div>

        {/* Action row */}
        <div className="border-t border-[#f0eeee] px-8 py-5">
          <button
            onClick={onConnect}
            className="rounded-[12px] bg-[#fff0c7] px-5 py-2.5 text-[13px] font-bold text-[#8b5b00] transition-colors hover:bg-[#ffe39a]"
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
      <p className="mb-1 text-[12px] font-medium text-[#697081]">{idea.author}</p>
      <p className="mb-3 text-[15px] font-bold leading-snug text-[#07122f]">{idea.problem}</p>
      <p className="text-[12px] font-medium leading-relaxed text-[#697081]">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#07122f]/60">
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
    <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
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
                "text-[11px] font-bold uppercase tracking-[0.12em] " + getStatusColor(idea.status)
              }
            >
              {idea.status}
            </span>
            <span className="text-[12px] font-medium text-[#697081]">
              · {idea.checkIns.length} check-in{idea.checkIns.length !== 1 ? "s" : ""}
            </span>
            {hasSimilar && (
              <span className="text-[11px] font-bold text-[#b57400]">· Similar idea on board</span>
            )}
            {idea.mentorEvaluation && <VerdictBadge verdict={idea.mentorEvaluation.verdict} />}
          </div>
          <p className="text-[17px] font-bold leading-snug text-[#07122f]">{idea.problem}</p>
          <p className="mt-1 text-[13px] font-medium text-[#697081]">{idea.author}</p>
        </div>
        <button
          onClick={onToggle}
          className="shrink-0 rounded-[12px] bg-[#f4f6f9] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#07122f] transition-colors hover:bg-[#dff5eb]"
        >
          {expanded ? "Collapse" : "View + Check in"}
        </button>
      </div>

      {/* Expanded detail + check-in */}
      {expanded && (
        <div className="border-t border-[#f0eeee]">
          {/* Full card details */}
          <div className="grid grid-cols-1 divide-y divide-[#f0eeee] md:grid-cols-2 md:divide-x md:divide-y-0">
            <DetailBlock label="The one-week experiment" value={idea.experiment} />
            <DetailBlock label="Willing to risk" value={idea.willingToRisk} />
          </div>
          <div className="grid grid-cols-1 divide-y divide-[#f0eeee] border-t border-[#f0eeee] md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="px-8 py-5">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#08764c]">
                Go signal
              </div>
              <p className="text-[13px] font-medium leading-relaxed text-[#07122f]">
                {idea.goSignal}
              </p>
            </div>
            <div className="px-8 py-5">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-red-600">
                Stop signal
              </div>
              <p className="text-[13px] font-medium leading-relaxed text-[#07122f]">
                {idea.stopSignal}
              </p>
            </div>
          </div>

          {canCreateManagerBrief && <ReadinessProfile idea={idea} />}

          {canCreateManagerBrief && (
            <div className="border-t border-[#f0eeee] bg-[#dff5eb] px-8 py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#08764c]">
                    Manager handoff
                  </div>
                  <p className="text-[13px] font-medium leading-relaxed text-[#406151]">
                    Create a pilot brief that answers the nine manager intake questions.
                  </p>
                </div>
                <button
                  onClick={() => downloadManagerBriefPdf(idea)}
                  className="shrink-0 rounded-[12px] bg-[#07122f] px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition-transform hover:-translate-y-0.5"
                >
                  Download manager brief PDF
                </button>
              </div>
            </div>
          )}

          {/* Check-in history */}
          {idea.checkIns.length > 0 && (
            <div className="border-t border-[#f0eeee] px-8 py-6">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
                Check-in history
              </div>
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
    <div className="border-t border-[#f0eeee] px-8 py-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
            Innovation readiness profile
          </div>
          <p className="max-w-[640px] text-[13px] font-medium leading-relaxed text-[#697081]">
            Assessment derived from mentor evaluation, experiment shape, risk guardrails, and
            check-in evidence.
          </p>
        </div>
        <div className="rounded-[12px] bg-[#dff5eb] px-4 py-3 text-right">
          <div className="text-[32px] font-black leading-none text-[#08764c]">{average}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#08764c]/70">
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

        <div className="rounded-[12px] bg-[#f4f6f9] p-5">
          <div className="mb-5">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
              Readiness radar
            </div>
            <ReadinessRadar dimensions={dimensions} />
          </div>

          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
            Innovation focus
          </div>
          <div className="flex flex-wrap gap-2">
            {focus.length > 0 ? (
              focus.map((item) => (
                <span
                  key={item}
                  className="rounded-[8px] bg-[#dff5eb] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#08764c]"
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-[12px] font-medium text-[#697081]">Focus still emerging</span>
            )}
          </div>

          {idea.mentorEvaluation?.biggestBlindspot && (
            <div className="mt-5 border-t border-[#e4e0de] pt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#b57400]">
                Watch item
              </div>
              <p className="text-[12px] font-medium leading-relaxed text-[#697081]">
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
            stroke="#d9d5d2"
            strokeDasharray={level === 100 ? "0" : "2 3"}
            strokeWidth="1"
          />
        ))}

        {dimensions.map((_, index) => {
          const edge = getPoint(index, 100, radius);
          const labelPoint = getPoint(index, 100, labelRadius);
          return (
            <g key={shortLabels[index]}>
              <line x1={center} y1={center} x2={edge.x} y2={edge.y} stroke="#d9d5d2" />
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
          fill="#24bf7a"
          fillOpacity="0.2"
          stroke="#24bf7a"
          strokeWidth="2"
        />
        {dimensions.map((dimension, index) => {
          const point = getPoint(index, dimension.value);
          return (
            <g key={dimension.label}>
              <circle cx={point.x} cy={point.y} r="3" fill="#24bf7a" />
              {!compact && (
                <text
                  x={point.x}
                  y={point.y - 8}
                  textAnchor="middle"
                  className="fill-[#08764c] text-[9px] font-bold"
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
    dimension.value >= 80 ? "bg-[#24bf7a]" : dimension.value >= 65 ? "bg-[#d79000]" : "bg-red-600";

  return (
    <div className="grid gap-2 md:grid-cols-[170px_1fr_92px] md:items-center">
      <div>
        <div className="text-[13px] font-bold text-[#07122f]">{dimension.label}</div>
        <div className="text-[11px] font-medium text-[#697081]">{dimension.status}</div>
      </div>
      <div>
        <div className="h-2 rounded-full bg-[#f0eeee]">
          <div
            className={`h-full rounded-full ${barClass}`}
            style={{ width: `${dimension.value}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#697081]">
          {dimension.note}
        </p>
      </div>
      <div className="text-[12px] font-bold text-[#697081] md:text-right">
        {dimension.value}/100
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: MentorEvaluation["verdict"] }) {
  const config = {
    pursue: { label: "Pursue", className: "bg-[#dff5eb] text-[#08764c]" },
    pause: { label: "Pause", className: "bg-[#fff0c7] text-[#8b5b00]" },
    drop: { label: "Drop", className: "bg-red-50 text-red-600" },
  }[verdict];

  return (
    <span
      className={`rounded-[6px] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-8 py-5">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
        {label}
      </div>
      <p className="text-[13px] font-medium leading-relaxed text-[#07122f]">{value}</p>
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
        <span className="mt-1.5 h-2 w-2 rounded-full bg-[#d9d5d2]" aria-hidden />
        <span className="w-px flex-1 bg-[#ece8e6]" aria-hidden />
      </div>
      <div className="flex-1 pb-2">
        <div className="mb-1 flex items-center gap-3">
          <span className="text-[11px] font-bold text-[#697081]">
            {format(new Date(checkIn.createdAt), "d MMM yyyy")}
          </span>
          <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${decisionColor}`}>
            {decisionLabel}
          </span>
        </div>
        <p className="text-[13px] font-medium leading-relaxed text-[#07122f]">{checkIn.learning}</p>
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
      <div className="border-t border-[#f0eeee] bg-[#f4f6f9] px-8 py-6">
        <p className="text-[13px] font-medium text-[#697081]">
          Check-in saved.{" "}
          <button
            onClick={() => setSaved(false)}
            className="font-bold text-[#07122f] underline underline-offset-4"
          >
            Add another
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-[#f0eeee] bg-[#f4f6f9] px-8 py-6">
      <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
        This week's check-in
      </div>

      <label className="block">
        <span className="mb-2 block text-[13px] font-medium text-[#697081]">
          What did you learn this week?
        </span>
        <textarea
          value={learning}
          onChange={(e) => setLearning(e.target.value)}
          placeholder="One honest observation about what the experiment revealed."
          rows={3}
          className="w-full resize-none rounded-[12px] border border-[#e4e0de] bg-white px-4 py-3 text-[14px] font-medium leading-relaxed text-[#07122f] outline-none transition-colors focus:border-[#24bf7a]"
        />
      </label>

      <div className="mt-4">
        <span className="mb-3 block text-[13px] font-medium text-[#697081]">Decision</span>
        <div className="flex gap-2">
          {(
            [
              {
                value: "continue" as const,
                label: "Continue →",
                active: "bg-[#24bf7a] text-[#07122f]",
                inactive: "bg-white text-[#07122f] hover:bg-[#dff5eb]",
              },
              {
                value: "pause" as const,
                label: "Pause ⏸",
                active: "bg-[#d79000] text-white",
                inactive: "bg-white text-[#07122f] hover:bg-[#fff0c7]",
              },
              {
                value: "stop" as const,
                label: "Stop ✕",
                active: "bg-red-600 text-white",
                inactive: "bg-white text-[#07122f] hover:bg-red-50",
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
                "rounded-[12px] px-4 py-2 text-[13px] font-bold transition-colors " +
                (decision === opt.value ? opt.active : opt.inactive)
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
          className="rounded-[12px] bg-[#07122f] px-6 py-2.5 text-[13px] font-bold tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Save check-in
        </button>
      </div>
    </div>
  );
}
