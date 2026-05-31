import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMode } from "@/lib/mode-context";

const managerNav = [
  { to: "/", label: "Conversation", n: "01" },
  { to: "/commitment", label: "Commitment", n: "02" },
  { to: "/check-in", label: "Check-in", n: "03" },
] as const;

const teamNav = [
  { to: "/team", label: "Conversation", n: "01" },
  { to: "/idea-board", label: "Idea Board", n: "02" },
] as const;

export function AppShell({
  children,
  teamMode,
}: {
  children: ReactNode;
  teamMode?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { mode, setMode } = useMode();
  const navigate = useNavigate();

  const nav = mode === "manager" ? managerNav : teamNav;

  return (
    <div className={`min-h-screen text-foreground ${teamMode ? "bg-[#FAFAF7]" : "bg-background"}`}>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-8">
          <Link to="/" className="flex items-baseline gap-3">
            <span className="h-2 w-2 translate-y-[-2px] bg-primary" aria-hidden />
            <span className="font-serif text-[22px] leading-none">
              Uncertainty Navigator
            </span>
            <span className="eyebrow ml-2 hidden md:inline">
              Affordable Loss · AI Pilots
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {/* Mode toggle */}
            <div className="mr-4 flex items-center rounded-sm border border-border p-0.5">
              <button
                onClick={() => { setMode("manager"); navigate({ to: "/" }); }}
                className={
                  "px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors " +
                  (mode === "manager"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                Manager
              </button>
              <button
                onClick={() => { setMode("team"); navigate({ to: "/team" }); }}
                className={
                  "px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors " +
                  (mode === "team"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                Team
              </button>
            </div>

            {/* Context nav */}
            {nav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "group relative px-4 py-2 text-[13px] transition-colors " +
                    (active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <span className="number-tag mr-2">{item.n}</span>
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-px h-px bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-24 border-t border-border">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-8 py-6 text-[12px] text-muted-foreground">
          <span>Uncertainty Navigator — Internal Methodology Tool</span>
          <span className="font-mono">v0.4 · Effectuation Practice</span>
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  teamStyle,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  teamStyle?: boolean;
}) {
  return (
    <div className="mx-auto max-w-[1240px] px-8 pt-16 pb-10">
      <div className="eyebrow">{eyebrow}</div>
      <h1 className={`mt-4 max-w-3xl font-serif text-[56px] leading-[1.02] ${teamStyle ? "tracking-wide" : ""}`}>
        {title}
      </h1>
      {lede && (
        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">
          {lede}
        </p>
      )}
    </div>
  );
}
