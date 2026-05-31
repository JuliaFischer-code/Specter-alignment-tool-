import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { Fragment, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  Gauge,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  blankCommitment,
  promptScript,
  sampleCommitment,
  saveCommitment,
  type CommitmentData,
} from "@/lib/commitment-store";
import { extractFromPdf } from "@/lib/pdf-intake.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Specter - Define Affordable Loss" },
      {
        name: "description",
        content:
          "A structured conversation that helps teams define affordable loss before starting an AI pilot.",
      },
      { property: "og:title", content: "Specter" },
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
  const [entered, setEntered] = useState(() => {
    if (typeof window === "undefined") return false;
    if (new URLSearchParams(window.location.search).has("intro")) return false;
    return sessionStorage.getItem("specter:intro-entered") === "1";
  });
  const [answers, setAnswers] = useState<CommitmentData>(blankCommitment);
  const [step, setStep] = useState(0);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [triedEmpty, setTriedEmpty] = useState<Set<number>>(new Set());
  const [missingFromPdf, setMissingFromPdf] = useState<string[]>([]);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const runExtract = useServerFn(extractFromPdf);

  const total = promptScript.length;
  const current = promptScript[step];
  const value = answers[current.id];
  const progress = useMemo(
    () => promptScript.filter((p) => answers[p.id].trim().length > 0).length,
    [answers],
  );
  const coverage = Math.round((progress / total) * 100);
  const currentLength = value.trim().length;
  const readiness = Math.min(100, Math.round(coverage * 0.75 + Math.min(25, currentLength / 6)));

  const update = (v: string) => setAnswers((a) => ({ ...a, [current.id]: v }));

  if (!entered) {
    return (
      <SpecterLanding
        onEnterManager={() => {
          sessionStorage.setItem("specter:intro-entered", "1");
          setEntered(true);
        }}
        onEnterEngineer={() => {
          sessionStorage.setItem("specter:intro-entered", "1");
          navigate({ to: "/team" });
        }}
      />
    );
  }

  const next = () => {
    if (value.trim().length === 0) {
      setTriedEmpty((prev) => new Set([...prev, step]));
    }
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
    setMissingFromPdf([]);
    setStep(total - 1);
  };

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfError(null);
    setPdfUploading(true);
    setPdfFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const pdfBase64 = btoa(binary);

      const result = await runExtract({
        data: {
          pdfBase64,
          fileName: file.name,
        },
      });

      setAnswers((prev) => {
        const next = { ...prev };
        for (const [rawKey, val] of Object.entries(result.answers)) {
          if (val && val.trim().length > 0) {
            const key = rawKey as keyof CommitmentData;
            next[key] = val;
          }
        }
        return next;
      });

      setMissingFromPdf(result.missing);

      if (result.missing.length > 0) {
        const firstMissingIndex = promptScript.findIndex((p) => result.missing.includes(p.id));
        if (firstMissingIndex >= 0) setStep(firstMissingIndex);
      }
    } catch (err: unknown) {
      setPdfError(err instanceof Error ? err.message : "PDF extraction failed.");
    } finally {
      setPdfUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const dotFill = (i: number, p: (typeof promptScript)[0]) => {
    if (answers[p.id].trim().length > 0) return "#22c55e";
    if (missingFromPdf.includes(p.id) || triedEmpty.has(i)) return "#ef4444";
    return "#d1d5db";
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-[#f4f6f9]">
        <section className="mx-auto max-w-[1340px] px-6 py-8">
          {/* Hero banner */}
          <div className="relative mb-6">
            <div className="grid grid-cols-1 gap-5 rounded-t-[16px] bg-[#07122f] p-6 text-white xl:grid-cols-[1fr_380px]">
              <div>
                <div className="mb-4 inline-flex rounded-[8px] bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#24bf7a]">
                  Manager · Step 01 · Commitment studio
                </div>
                <h1 className="max-w-[880px] font-sans text-[52px] font-black leading-[0.98] tracking-normal text-white md:text-[72px]">
                  Decide what you can afford to lose
                </h1>
                <p className="mt-5 max-w-[720px] text-[16px] leading-relaxed text-white/70">
                  Turn a proposed AI pilot into a concrete commitment: owner, budget ceiling,
                  time-box, kill criteria, and continuation signal.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 self-end">
                <ManagerHeroMetric label="Coverage" value={`${coverage}%`} />
                <ManagerHeroMetric label="Questions" value={`${progress}/${total}`} />
              </div>
            </div>
            <div className="h-10 bg-gradient-to-b from-[#07122f] to-[#f4f6f9]" />
          </div>

          {/* Progress stepper + toggle button */}
          <div className="mb-2 flex items-center gap-4 px-1">
            <div className="flex flex-1 items-center">
              {promptScript.map((p, i) => {
                const active = i === step;
                const fill = dotFill(i, p);
                return (
                  <Fragment key={p.id}>
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
              maxHeight: showAllQuestions ? "720px" : "0",
              overflow: "hidden",
              transition: "max-height 0.3s ease",
            }}
          >
            <div className="mb-6 rounded-[16px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.10)]">
              <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
                Question set
              </div>
              <ol className="space-y-1">
                {promptScript.map((p, i) => {
                  const active = i === step;
                  return (
                    <li key={p.id}>
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
                        <span className="flex-1 leading-snug">{p.question}</span>
                        <span
                          className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full transition-colors"
                          style={{ backgroundColor: dotFill(i, p) }}
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-4 border-t pt-4">
                <button
                  onClick={loadSample}
                  className="inline-flex items-center gap-2 rounded-[12px] bg-[#f4f6f9] px-3 py-2 text-[12px] font-bold text-[#07122f] hover:bg-[#dff5eb]"
                >
                  <Sparkles className="h-4 w-4 text-[#24bf7a]" />
                  Load worked example
                </button>
              </div>
            </div>
          </div>

          {/* Two-column main layout */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[65%_1fr]">
            {/* Main question card */}
            <div className="rounded-[16px] bg-white p-10 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <span className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-[#08764c]">
                Question {String(step + 1).padStart(2, "0")} / {total}
              </span>

              <h2 className="mt-6 font-sans text-[36px] font-black leading-[1.05] tracking-normal text-[#07122f]">
                {current.question}
              </h2>
              <p className="mt-3 text-[14px] font-medium text-[#697081]">{current.hint}</p>

              <textarea
                value={value}
                onChange={(e) => update(e.target.value)}
                placeholder={current.placeholder}
                rows={10}
                className="mt-8 w-full resize-none rounded-[12px] border border-[#e4e0de] bg-[#f4f6f9] p-4 text-[15px] font-medium leading-relaxed text-[#07122f] outline-none transition-colors focus:border-[#24bf7a] focus:bg-white"
                autoFocus
              />

              <div className="mt-8 flex items-center justify-between">
                {step === 0 ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className={
                        "inline-flex min-w-[180px] cursor-pointer items-center justify-center gap-2 rounded-[12px] px-6 py-3 text-[13px] font-bold tracking-wide transition-colors " +
                        (pdfUploading
                          ? "pointer-events-none bg-[#f4f2f3] text-[#697081] opacity-50"
                          : "bg-[#07122f] text-white hover:bg-[#12204a]")
                      }
                    >
                      {pdfUploading ? "Extracting…" : "Upload PDF"}
                    </label>
                  </>
                ) : (
                  <button
                    onClick={() => setStep(Math.max(0, step - 1))}
                    className="text-[13px] font-bold text-[#697081] transition-colors hover:text-[#07122f]"
                  >
                    ← Previous
                  </button>
                )}
                <div className="flex items-center gap-3">
                  {step < total - 1 ? (
                    <button
                      onClick={next}
                      className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-[12px] bg-[#07122f] px-6 py-3 text-[13px] font-bold tracking-wide text-white transition-transform hover:-translate-y-0.5"
                    >
                      Next question <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => finalize(answers)}
                      className="inline-flex items-center gap-2 rounded-[12px] bg-[#24bf7a] px-6 py-3 text-[13px] font-bold tracking-wide text-[#07122f] transition-transform hover:-translate-y-0.5"
                    >
                      Generate commitment document <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <CommitmentPreview
              answers={answers}
              readiness={readiness}
              coverage={coverage}
              missingCount={missingFromPdf.length}
              pdfFileName={pdfFileName}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

const BH_CSS = `
  @keyframes bhBackdropDrift {
    0%   { transform: scale(1.03) translate3d(0, 0, 0); }
    50%  { transform: scale(1.08) translate3d(-1.2%, 0.8%, 0); }
    100% { transform: scale(1.03) translate3d(0, 0, 0); }
  }
  .mode-card {
    position: relative;
    overflow: visible;
    border: 1px solid rgba(255,255,255,0.22);
    transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease, background 0.35s ease;
  }
  .mode-card:hover {
    background: rgba(7,18,47,0.78);
    border-color: rgba(36,191,122,0.58);
    box-shadow: 0 0 6px rgba(36,191,122,0.24), 0 0 24px rgba(36,191,122,0.14), 0 24px 80px rgba(0,0,0,0.32);
    transform: translateY(-4px);
  }
  .mode-card[data-variant="engineer"]:hover {
    border-color: rgba(76,165,213,0.62);
    box-shadow: 0 0 6px rgba(76,165,213,0.24), 0 0 24px rgba(36,191,122,0.12), 0 24px 80px rgba(0,0,0,0.32);
  }
  @keyframes bhExpand {
    0%   { transform: translate(-50%,-50%) scale(1);  }
    100% { transform: translate(-50%,-50%) scale(25); }
  }
  @keyframes bhTitleSuck {
    0%   { opacity: 1; transform: scale(1);    filter: blur(0px);  }
    100% { opacity: 0; transform: scale(0.04); filter: blur(14px); }
  }
  @keyframes bhClickPulse {
    0%, 100% { opacity: 0.3;  }
    50%       { opacity: 0.75; }
  }
  @keyframes bhCardsReveal {
    0%   { opacity: 0; transform: translate(-50%, calc(-50% + 20px)); }
    100% { opacity: 1; transform: translate(-50%, -50%);              }
  }
`;

function SpecterLanding({
  onEnterManager,
  onEnterEngineer,
}: {
  onEnterManager: () => void;
  onEnterEngineer: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "collapsing" | "selecting">("idle");
  const clickedRef = useRef(false);

  function handleClick() {
    if (clickedRef.current) return;
    clickedRef.current = true;
    setPhase("collapsing");
    window.setTimeout(() => setPhase("selecting"), 1000);
  }

  const isIdle = phase === "idle";
  const isCollapsing = phase === "collapsing";
  const isSelecting = phase === "selecting";

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        background: "#060910",
        overflow: "hidden",
        userSelect: "none",
        cursor: isSelecting ? "default" : "pointer",
      }}
      onClick={handleClick}
    >
      <style>{BH_CSS}</style>

      <img
        src="/singularity-proof-lede1300.gif"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: isSelecting ? 0.38 : 0.72,
          filter: isSelecting
            ? "brightness(0.38) contrast(1.06) saturate(0.72)"
            : "brightness(0.64) contrast(1.08) saturate(0.78)",
          transform: isCollapsing ? "scale(1.18)" : "scale(1.03)",
          transition: "opacity 700ms ease, filter 700ms ease, transform 900ms ease",
          animation: isSelecting ? undefined : "bhBackdropDrift 18s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 58%, rgba(0,0,0,0.02) 0%, rgba(7,18,47,0.28) 42%, rgba(3,6,14,0.82) 100%), linear-gradient(180deg, rgba(7,18,47,0.42), rgba(3,6,14,0.72))",
          pointerEvents: "none",
        }}
      />

      {isCollapsing && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "clamp(220px,28vw,400px)",
            height: "clamp(120px,18vh,240px)",
            background: "#000",
            borderRadius: "50%",
            zIndex: 50,
            animation: "bhExpand 800ms ease-in forwards",
            pointerEvents: "none",
          }}
        />
      )}

      {!isSelecting && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(24px, 5vw, 64px)",
            textAlign: "center",
            animation: isCollapsing
              ? "bhTitleSuck 600ms cubic-bezier(0.4,0,1,1) forwards"
              : undefined,
          }}
        >
          <SpecterLandingMark />
          <h1
            style={{
              fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
              fontSize: "clamp(76px,13vw,170px)",
              fontWeight: 900,
              color: "#fff",
              lineHeight: 0.82,
              margin: "22px 0 0",
              letterSpacing: "-0.045em",
              textShadow: "0 10px 36px rgba(0,0,0,.76)",
            }}
          >
            Specter
          </h1>
          <p
            style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.22em",
              color: "#24bf7a",
              textTransform: "uppercase",
              margin: "22px 0 0",
              padding: "8px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(36,191,122,0.34)",
              background: "rgba(7,18,47,0.58)",
            }}
          >
            KNOW WHERE THE LINE IS
          </p>
          <p
            style={{
              margin: "24px 0 0",
              maxWidth: "720px",
              color: "rgba(255,255,255,0.72)",
              fontSize: "clamp(15px,1.7vw,19px)",
              fontWeight: 700,
              lineHeight: 1.5,
              textShadow: "0 8px 24px rgba(0,0,0,0.78)",
            }}
          >
            Define the line, test the signal, and see when a pilot starts bending out of shape.
          </p>
        </div>
      )}

      {isIdle && (
        <p
          style={{
            position: "absolute",
            bottom: "7%",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 15,
            pointerEvents: "none",
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: "12px",
            letterSpacing: "0.15em",
            color: "#22c55e",
            textTransform: "uppercase",
            animation: "bhClickPulse 2.4s ease-in-out infinite",
          }}
        >
          click anywhere to enter
        </p>
      )}

      {isSelecting && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "100%",
            maxWidth: "1100px",
            padding: "0 24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            zIndex: 20,
            boxSizing: "border-box",
            animation: "bhCardsReveal 600ms ease both",
          }}
        >
          <ModeCard
            variant="manager"
            label="MANAGER"
            labelColor="#22c55e"
            title="Commitment series"
            description="Define the affordable-loss line, generate the commitment, and run governance check-ins."
            cta="ENTER MANAGER FLOW →"
            ctaColor="#22c55e"
            onClick={(e) => {
              e.stopPropagation();
              onEnterManager();
            }}
          />
          <ModeCard
            variant="engineer"
            label="ENGINEER"
            labelColor="#9bd8ff"
            title="Experiment series"
            description="Shape a small bet, test the evidence, and decide whether the idea deserves a handoff."
            cta="ENTER ENGINEER FLOW →"
            ctaColor="#9bd8ff"
            onClick={(e) => {
              e.stopPropagation();
              onEnterEngineer();
            }}
          />
        </div>
      )}
    </main>
  );
}

function ModeCard({
  variant,
  label,
  labelColor,
  title,
  description,
  cta,
  ctaColor,
  onClick,
}: {
  variant: "manager" | "engineer";
  label: string;
  labelColor: string;
  title: string;
  description: string;
  cta: string;
  ctaColor: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mode-card"
      data-variant={variant}
      style={{
        background: "rgba(8,12,20,0.70)",
        borderRadius: "18px",
        padding: "32px",
        textAlign: "left",
        cursor: "pointer",
        color: "#fff",
        backdropFilter: "blur(10px)",
        minHeight: "250px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: labelColor,
          textTransform: "uppercase",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
          fontSize: "clamp(30px,4vw,44px)",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          color: "#fff",
          marginTop: "14px",
          lineHeight: 0.98,
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.6)",
          marginTop: "16px",
          lineHeight: 1.65,
        }}
      >
        {description}
      </p>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: ctaColor,
          marginTop: "24px",
          textTransform: "uppercase",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
      >
        {cta}
      </div>
    </button>
  );
}

function SpecterLandingMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-20 w-20 shrink-0 opacity-90 drop-shadow-[0_8px_22px_rgba(36,191,122,0.12)] md:h-24 md:w-24"
      role="img"
      aria-label="Specter logo"
    >
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
  );
}

function ManagerHeroMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] bg-white p-4 text-[#07122f]">
      <div className="text-[34px] font-black leading-none">{value}</div>
      <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d93a1]">
        {label}
      </div>
    </div>
  );
}

function ManagerReadinessPanel({
  coverage,
  readiness,
  missingCount,
  pdfFileName,
}: {
  coverage: number;
  readiness: number;
  missingCount: number;
  pdfFileName: string | null;
}) {
  const checks = [
    { label: "Owner named", icon: ShieldCheck, active: coverage >= 20 },
    { label: "Loss boundary visible", icon: Gauge, active: coverage >= 45 },
    { label: "Time-box declared", icon: Timer, active: coverage >= 60 },
    { label: "Decision gates captured", icon: CheckCircle2, active: coverage >= 85 },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
        <Gauge className="h-4 w-4 text-[#24bf7a]" />
        Commitment readiness
      </div>
      <div className="rounded-[16px] bg-[#07122f] p-5 text-white">
        <div className="text-[44px] font-black leading-none">{readiness}%</div>
        <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
          Steering-ready
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
                "flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-semibold " +
                (check.active ? "bg-[#f4f6f9] text-[#07122f]" : "text-[#697081]")
              }
            >
              <Icon className={check.active ? "h-4 w-4 text-[#24bf7a]" : "h-4 w-4"} />
              {check.label}
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-[12px] font-medium text-[#697081]">
        {pdfFileName ? `Imported: ${pdfFileName}` : "Manual entry or PDF import"} · {missingCount}{" "}
        missing
      </div>
    </div>
  );
}

function CommitmentPreview({
  answers,
  readiness,
  coverage,
  missingCount,
  pdfFileName,
}: {
  answers: CommitmentData;
  readiness: number;
  coverage: number;
  missingCount: number;
  pdfFileName: string | null;
}) {
  return (
    <div className="rounded-[12px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
        <PlayCircle className="h-4 w-4 text-[#24bf7a]" />
        Live brief
      </div>
      <div className="rounded-[12px] bg-[#f4f6f9] p-5">
        <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#08764c]">
          Pilot
        </div>
        <div className="mt-2 text-[22px] font-black leading-tight text-[#07122f]">
          {answers.pilotName || "Untitled pilot"}
        </div>
        <div className="mt-5 space-y-3 text-[13px] font-medium text-[#697081]">
          <PreviewLine label="Sponsor" value={answers.sponsor} />
          <PreviewLine label="Time-box" value={answers.timeBox} />
          <PreviewLine label="Ceiling" value={answers.budgetCeiling} />
          <PreviewLine label="Readiness" value={`${readiness}%`} />
        </div>
      </div>
      <div className="mt-5">
        <ManagerReadinessPanel
          coverage={coverage}
          readiness={readiness}
          missingCount={missingCount}
          pdfFileName={pdfFileName}
        />
      </div>
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span>{label}</span>
      <span className="max-w-[150px] truncate text-right font-bold text-[#07122f]">
        {value || "—"}
      </span>
    </div>
  );
}
