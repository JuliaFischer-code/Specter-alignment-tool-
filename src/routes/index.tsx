import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
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
  const [entered, setEntered] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem("specter:intro-entered") === "1",
  );
  const [answers, setAnswers] = useState<CommitmentData>(blankCommitment);
  const [step, setStep] = useState(0);
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

      // Merge extracted answers into state (only overwrite if non-empty)
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

      // Jump to first missing question if any, otherwise step 0
      if (result.missing.length > 0) {
        const firstMissingIndex = promptScript.findIndex((p) => result.missing.includes(p.id));
        if (firstMissingIndex >= 0) setStep(firstMissingIndex);
      }
    } catch (err: unknown) {
      setPdfError(err instanceof Error ? err.message : "PDF extraction failed.");
    } finally {
      setPdfUploading(false);
      // Reset input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const dotColor = (id: string, done: boolean) => {
    if (done) return "bg-primary"; // green
    if (missingFromPdf.includes(id)) return "bg-destructive"; // red — AI couldn't find it
    return "bg-border"; // default grey
  };

  return (
    <AppShell>
      <section className="mx-auto max-w-[1340px] px-6 py-8">
        <div className="mb-6 grid grid-cols-1 gap-5 rounded-[8px] bg-[#07122f] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] xl:grid-cols-[1fr_380px]">
          <div>
            <div className="mb-4 inline-flex rounded-[8px] bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#24bf7a]">
              Manager · Step 01 · Commitment studio
            </div>
            <h1 className="max-w-[880px] font-sans text-[52px] font-black leading-[0.98] tracking-normal text-white md:text-[72px]">
              Decide what you can afford to lose
            </h1>
            <p className="mt-5 max-w-[720px] text-[16px] leading-relaxed text-white/70">
              Turn a proposed AI pilot into a concrete commitment: owner, budget ceiling, time-box,
              kill criteria, and continuation signal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 self-end">
            <ManagerHeroMetric label="Coverage" value={`${coverage}%`} />
            <ManagerHeroMetric label="Questions" value={`${progress}/${total}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[330px_1fr]">
          <aside className="space-y-5">
            <div className="rounded-[8px] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <div className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
                Question set
              </div>
              <ol className="space-y-2">
                {promptScript.map((p, i) => {
                  const done = answers[p.id].trim().length > 0;
                  const active = i === step;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => setStep(i)}
                        className={
                          "group flex w-full items-start gap-3 rounded-[8px] px-3 py-3 text-left text-[13px] font-semibold transition-colors " +
                          (active
                            ? "bg-[#dff5eb] text-[#07122f]"
                            : "text-[#697081] hover:bg-[#f4f2f3] hover:text-[#07122f]")
                        }
                      >
                        <span className="w-6 shrink-0 font-mono text-[11px] text-[#08764c]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 leading-snug">{p.question}</span>
                        <span
                          className={
                            "mt-1 h-1.5 w-1.5 shrink-0 rounded-full transition-colors " +
                            dotColor(p.id, done)
                          }
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#f0eeee]">
                <div
                  className="h-full rounded-full bg-[#24bf7a]"
                  style={{ width: `${coverage}%` }}
                />
              </div>
            </div>

            <ManagerReadinessPanel
              coverage={coverage}
              readiness={readiness}
              missingCount={missingFromPdf.length}
              pdfFileName={pdfFileName}
            />
          </aside>

          <div className="space-y-5">
            <div className="rounded-[8px] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
                    <FileUp className="h-4 w-4 text-[#24bf7a]" />
                    Import from document
                  </div>
                  <p className="text-[13px] font-medium text-[#697081]">
                    Upload a PDF and we'll pre-fill what we can find. Missing answers will be
                    flagged in red.
                  </p>
                </div>
                <div className="shrink-0">
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
                      "inline-flex cursor-pointer items-center gap-2 rounded-[8px] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors " +
                      (pdfUploading
                        ? "pointer-events-none bg-[#f4f2f3] text-[#697081] opacity-50"
                        : "bg-[#07122f] text-white hover:bg-[#12204a]")
                    }
                  >
                    <FileUp className="h-4 w-4" />
                    {pdfUploading ? "Extracting…" : "Upload PDF"}
                  </label>
                </div>
              </div>

              {pdfFileName && !pdfUploading && !pdfError && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] font-medium text-[#697081]">
                  <span className="h-2 w-2 rounded-full bg-[#24bf7a]" />
                  <span>{pdfFileName} imported</span>
                  {missingFromPdf.length > 0 && (
                    <span className="font-semibold text-red-600">
                      · {missingFromPdf.length} question{missingFromPdf.length > 1 ? "s" : ""} not
                      found in document
                    </span>
                  )}
                </div>
              )}

              {pdfError && (
                <p className="mt-3 text-[12px] font-semibold text-red-600">{pdfError}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
              <div className="rounded-[8px] bg-white p-8 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-[#08764c]">
                    Question {String(step + 1).padStart(2, "0")} / {total}
                  </span>
                  <button
                    onClick={loadSample}
                    className="inline-flex items-center gap-2 rounded-[8px] bg-[#f7f5f4] px-3 py-2 text-[12px] font-bold text-[#07122f] hover:bg-[#dff5eb]"
                  >
                    <Sparkles className="h-4 w-4 text-[#24bf7a]" />
                    Load worked example
                  </button>
                </div>

                <h2 className="mt-6 font-sans text-[36px] font-black leading-[1.05] tracking-normal text-[#07122f]">
                  {current.question}
                </h2>
                <p className="mt-3 text-[14px] font-medium text-[#697081]">{current.hint}</p>

                <textarea
                  value={value}
                  onChange={(e) => update(e.target.value)}
                  placeholder={current.placeholder}
                  rows={7}
                  className="mt-8 w-full resize-none rounded-[8px] border border-[#e4e0de] bg-[#f7f5f4] p-4 text-[15px] font-medium leading-relaxed text-[#07122f] outline-none transition-colors focus:border-[#24bf7a] focus:bg-white"
                  autoFocus
                />

                <div className="mt-8 flex items-center justify-between">
                  <button
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="text-[13px] font-bold text-[#697081] transition-colors hover:text-[#07122f] disabled:opacity-30"
                  >
                    ← Previous
                  </button>
                  <div className="flex items-center gap-3">
                    {step < total - 1 ? (
                      <button
                        onClick={next}
                        className="inline-flex items-center gap-2 rounded-[8px] bg-[#07122f] px-6 py-3 text-[13px] font-bold tracking-wide text-white transition-transform hover:-translate-y-0.5"
                      >
                        Next question <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => finalize(answers)}
                        className="inline-flex items-center gap-2 rounded-[8px] bg-[#24bf7a] px-6 py-3 text-[13px] font-bold tracking-wide text-[#07122f] transition-transform hover:-translate-y-0.5"
                      >
                        Generate commitment document <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <CommitmentPreview answers={answers} readiness={readiness} />
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

const BH_CSS = `
  @keyframes bhGridDrift {
    0%   { transform: perspective(700px) rotateX(68deg) translateY(-10%) scale(1.3); }
    100% { transform: perspective(700px) rotateX(68deg) translateY(32%)  scale(1.6); }
  }
  @keyframes bhOrbitCW  { to { transform: rotate( 360deg); } }
  @keyframes bhOrbitCCW { to { transform: rotate(-360deg); } }
  @keyframes bhCenterGlow {
    0%, 100% { box-shadow: 0 0 40px 14px rgba(0,200,150,.10), 0 0 90px  40px rgba(0, 80, 80,.07); }
    50%       { box-shadow: 0 0 60px 22px rgba(0,255,204,.20), 0 0 130px 65px rgba(0,110,110,.13); }
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

const BH_RINGS = [
  { rx: 460, ry: 128, stroke: '#0a3a3a', sw: 0.8, dur: '24s',  cw: true  },
  { rx: 390, ry: 108, stroke: '#0a3a3a', sw: 0.8, dur: '19s',  cw: false },
  { rx: 320, ry: 88,  stroke: '#0d4f4f', sw: 1.2, dur: '14s',  cw: true  },
  { rx: 250, ry: 68,  stroke: '#0d4f4f', sw: 1.5, dur: '10s',  cw: false },
  { rx: 185, ry: 50,  stroke: '#0d5a5a', sw: 1.5, dur: '7.5s', cw: true  },
  { rx: 120, ry: 32,  stroke: '#22c55e', sw: 2,   dur: '5s',   cw: false },
  { rx: 68,  ry: 18,  stroke: '#00ffcc', sw: 2.5, dur: '3.2s', cw: true  },
];

function SpecterLanding({
  onEnterManager,
  onEnterEngineer,
}: {
  onEnterManager: () => void;
  onEnterEngineer: () => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'collapsing' | 'selecting'>('idle');

  function handleClick() {
    if (phase !== 'idle') return;
    setPhase('collapsing');
    window.setTimeout(() => setPhase('selecting'), 1000);
  }

  const isIdle = phase === 'idle';
  const isCollapsing = phase === 'collapsing';
  const isSelecting = phase === 'selecting';

  return (
    <main
      style={{
        position: 'fixed', inset: 0, background: '#060910',
        overflow: 'hidden', userSelect: 'none',
        cursor: isSelecting ? 'default' : 'pointer',
      }}
      onClick={!isSelecting ? handleClick : undefined}
    >
      <style>{BH_CSS}</style>

      {/* Perspective grid — animated in phases 1 & 2, static+dimmed in phase 3 */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: '-60%',
          backgroundImage:
            'linear-gradient(to right,#0a3a3a 1px,transparent 1px),' +
            'linear-gradient(to bottom,#0a3a3a 1px,transparent 1px)',
          backgroundSize: '60px 60px',
          opacity: isSelecting ? 0.15 : 0.55,
          transition: 'opacity 0.8s ease',
          animation: isSelecting ? undefined : 'bhGridDrift 6s linear infinite alternate',
          transform: isSelecting
            ? 'perspective(700px) rotateX(68deg) translateY(-10%) scale(1.3)'
            : undefined,
        }} />
      </div>

      {/* Orbital rings — phases 1 & 2 only */}
      {!isSelecting && (
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid slice"
        >
          {BH_RINGS.map((ring, i) => (
            <ellipse
              key={i}
              cx="500" cy="300"
              rx={ring.rx} ry={ring.ry}
              stroke={ring.stroke} strokeWidth={ring.sw} fill="none"
              style={{
                transformOrigin: '500px 300px',
                animation: `${ring.cw ? 'bhOrbitCW' : 'bhOrbitCCW'} ${ring.dur} linear infinite`,
              }}
            />
          ))}
        </svg>
      )}

      {/* Black hole center oval — phases 1 & 2 */}
      {!isSelecting && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 'clamp(220px,28vw,400px)', height: 'clamp(120px,18vh,240px)',
          background: '#000', borderRadius: '50%', zIndex: 5,
          transform: 'translate(-50%,-50%)',
          animation: isCollapsing
            ? 'bhExpand 800ms ease-in forwards'
            : 'bhCenterGlow 3.5s ease-in-out infinite',
        }} />
      )}

      {/* Title / logo — phases 1 & 2 */}
      {!isSelecting && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: isCollapsing ? 'bhTitleSuck 600ms cubic-bezier(0.4,0,1,1) forwards' : undefined,
        }}>
          <SpecterLandingMark />
          <h1 style={{
            fontFamily: '"Georgia","Times New Roman",serif',
            fontSize: 'clamp(64px,12vw,148px)', fontWeight: 700,
            color: '#fff', lineHeight: 0.88, margin: '24px 0 0',
            textShadow: '0 10px 40px rgba(0,0,0,.65)',
          }}>
            Specter
          </h1>
          <p style={{
            fontFamily: '"Courier New",Courier,monospace',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em',
            color: '#00ffcc', textTransform: 'uppercase', margin: '20px 0 0',
          }}>
            KNOW WHERE THE LINE IS
          </p>
        </div>
      )}

      {/* Click prompt — idle only */}
      {isIdle && (
        <p style={{
          position: 'absolute', bottom: '7%', left: 0, right: 0,
          textAlign: 'center', zIndex: 15, pointerEvents: 'none',
          fontFamily: '"Courier New",Courier,monospace', fontSize: '12px',
          letterSpacing: '0.15em', color: '#22c55e', textTransform: 'uppercase',
          animation: 'bhClickPulse 2.4s ease-in-out infinite',
        }}>
          click anywhere to enter
        </p>
      )}

      {/* Mode selection — phase 3 */}
      {isSelecting && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: '100%', maxWidth: '1100px', padding: '0 24px',
          display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '20px',
          zIndex: 20, boxSizing: 'border-box',
          animation: 'bhCardsReveal 600ms ease both',
        }}>
          <ModeCard
            label="MANAGER" labelColor="#22c55e"
            title="Commitment series"
            description="Define the affordable-loss line, generate the commitment, and run governance check-ins."
            cta="ENTER MANAGER FLOW →" ctaColor="#22c55e"
            border="rgba(34,197,94,0.25)" hoverBorder="rgba(34,197,94,0.6)"
            onClick={(e) => { e.stopPropagation(); onEnterManager(); }}
          />
          <ModeCard
            label="ENGINEER" labelColor="rgba(255,255,255,0.5)"
            title="Experiment series"
            description="Shape a small bet, test the evidence, and decide whether the idea deserves a handoff."
            cta="ENTER ENGINEER FLOW →" ctaColor="#ffffff"
            border="rgba(255,255,255,0.08)" hoverBorder="rgba(255,255,255,0.28)"
            onClick={(e) => { e.stopPropagation(); onEnterEngineer(); }}
          />
        </div>
      )}
    </main>
  );
}

function ModeCard({
  label, labelColor, title, description, cta, ctaColor, border, hoverBorder, onClick,
}: {
  label: string; labelColor: string; title: string; description: string;
  cta: string; ctaColor: string; border: string; hoverBorder: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? hoverBorder : border}`,
        borderRadius: '12px', padding: '32px', textAlign: 'left',
        cursor: 'pointer', color: '#fff',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{
        fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em',
        color: labelColor, textTransform: 'uppercase', fontFamily: 'monospace',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '34px', fontWeight: 800, color: '#fff', marginTop: '12px', lineHeight: 1.1 }}>
        {title}
      </div>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '16px', lineHeight: 1.65 }}>
        {description}
      </p>
      <div style={{
        fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em',
        color: ctaColor, marginTop: '24px', textTransform: 'uppercase', fontFamily: 'monospace',
      }}>
        {cta}
      </div>
    </button>
  );
}

function SpecterLandingMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-20 w-20 shrink-0 drop-shadow-[0_10px_30px_rgba(36,191,122,0.2)] md:h-24 md:w-24"
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
    <div className="rounded-[8px] bg-white p-4 text-[#07122f]">
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
    <div className="rounded-[8px] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
        <Gauge className="h-4 w-4 text-[#24bf7a]" />
        Commitment readiness
      </div>
      <div className="rounded-[8px] bg-[#07122f] p-5 text-white">
        <div className="text-[44px] font-black leading-none">{readiness}%</div>
        <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
          Steering-ready
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/12">
          <div className="h-full rounded-full bg-[#24bf7a]" style={{ width: `${readiness}%` }} />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <div
              key={check.label}
              className={
                "flex items-center gap-3 rounded-[8px] px-3 py-2 text-[13px] font-semibold " +
                (check.active ? "bg-[#dff5eb] text-[#07122f]" : "bg-[#f7f5f4] text-[#697081]")
              }
            >
              <Icon className={check.active ? "h-4 w-4 text-[#24bf7a]" : "h-4 w-4"} />
              {check.label}
            </div>
          );
        })}
      </div>
      <div className="mt-5 text-[12px] font-medium text-[#697081]">
        {pdfFileName ? `Imported: ${pdfFileName}` : "Manual entry or PDF import"} · {missingCount}{" "}
        missing
      </div>
    </div>
  );
}

function CommitmentPreview({ answers, readiness }: { answers: CommitmentData; readiness: number }) {
  return (
    <div className="rounded-[8px] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
        <PlayCircle className="h-4 w-4 text-[#24bf7a]" />
        Live brief
      </div>
      <div className="rounded-[8px] bg-[#f7f5f4] p-5">
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
