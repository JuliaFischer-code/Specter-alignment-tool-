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

export function AppShell({ children, teamMode }: { children: ReactNode; teamMode?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { mode, setMode } = useMode();
  const navigate = useNavigate();

  const managerRoutes = new Set(["/", "/commitment", "/check-in"]);
  const currentMode = teamMode ? "team" : managerRoutes.has(pathname) ? "manager" : mode;
  const nav = currentMode === "manager" ? managerNav : teamNav;
  const dashboardSkin =
    teamMode ||
    pathname === "/" ||
    pathname === "/team" ||
    pathname === "/commitment" ||
    pathname === "/check-in";
  const managerModeClass = dashboardSkin
    ? currentMode === "manager"
      ? "bg-[#07122f] text-white"
      : "text-[#697081] hover:text-[#07122f]"
    : currentMode === "manager"
      ? "bg-foreground text-background"
      : "text-muted-foreground hover:text-foreground";
  const teamModeClass = dashboardSkin
    ? currentMode === "team"
      ? "bg-[#07122f] text-white"
      : "text-[#697081] hover:text-[#07122f]"
    : currentMode === "team"
      ? "bg-foreground text-background"
      : "text-muted-foreground hover:text-foreground";

  return (
    <div
      className={`min-h-screen text-foreground ${dashboardSkin ? "bg-[#f4f2f3]" : "bg-background"}`}
    >
      <header
        className={
          dashboardSkin
            ? "border-b border-[#e4e0de] bg-[#f4f2f3]"
            : "border-b border-border bg-background"
        }
      >
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-8">
          <Link to="/" className="flex items-baseline gap-3">
            <span
              className={
                "h-2 w-2 translate-y-[-2px] " +
                (dashboardSkin ? "rounded-full bg-[#24bf7a]" : "bg-primary")
              }
              aria-hidden
            />
            <span
              className={
                dashboardSkin
                  ? "text-[22px] font-black leading-none tracking-normal text-[#07122f]"
                  : "font-serif text-[22px] leading-none"
              }
            >
              Uncertainty Navigator
            </span>
            <span
              className={
                dashboardSkin
                  ? "ml-2 hidden text-[11px] font-bold uppercase tracking-[0.16em] text-[#8d93a1] md:inline"
                  : "eyebrow ml-2 hidden md:inline"
              }
            >
              Affordable Loss · AI Pilots
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {/* Context nav — always 3 slots to prevent layout shift */}
            {nav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "group relative rounded-[8px] px-4 py-2 text-[13px] font-semibold transition-colors " +
                    (dashboardSkin
                      ? active
                        ? "bg-white text-[#07122f] shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                        : "text-[#697081] hover:bg-white/60 hover:text-[#07122f]"
                      : active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <span className="number-tag mr-2">{item.n}</span>
                  {item.label}
                  {active && !dashboardSkin && (
                    <span className="absolute inset-x-3 -bottom-px h-px bg-primary" />
                  )}
                </Link>
              );
            })}
            {currentMode === "team" && (
              <span aria-hidden className="invisible pointer-events-none px-4 py-2 text-[13px]">
                <span className="number-tag mr-2">03</span>
                Check-in
              </span>
            )}
          </nav>
        </div>
      </header>
      <div className={dashboardSkin ? "pt-6 pb-0" : "pt-16 pb-0"}>
        <div className="mx-auto max-w-[1240px] px-8">
          <div
            className={
              "flex w-fit items-center p-0.5 " +
              (dashboardSkin
                ? "rounded-[8px] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
                : "rounded-sm border border-border")
            }
          >
            <button
              onClick={() => {
                setMode("manager");
                navigate({ to: "/" });
              }}
              className={
                "w-24 rounded-[7px] py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.1em] transition-colors " +
                managerModeClass
              }
            >
              Manager
            </button>
            <button
              onClick={() => {
                setMode("team");
                navigate({ to: "/team" });
              }}
              className={
                "w-24 rounded-[7px] py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.1em] transition-colors " +
                teamModeClass
              }
            >
              Team
            </button>
          </div>
        </div>
      </div>
      <main>{children}</main>
      <footer
        className={
          dashboardSkin ? "mt-16 border-t border-[#e4e0de]" : "mt-24 border-t border-border"
        }
      >
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
    <div className="mx-auto max-w-[1240px] px-8 pt-6 pb-10">
      <div className="eyebrow">{eyebrow}</div>
      <h1
        className={`mt-4 max-w-3xl font-serif text-[56px] leading-[1.02] ${teamStyle ? "tracking-wide" : ""}`}
      >
        {title}
      </h1>
      {lede && (
        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">{lede}</p>
      )}
    </div>
  );
}
