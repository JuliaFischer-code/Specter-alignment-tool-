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

function SpecterLanding({
  onEnterManager,
  onEnterEngineer,
}: {
  onEnterManager: () => void;
  onEnterEngineer: () => void;
}) {
  const [portalOpen, setPortalOpen] = useState(false);
  const [plunging, setPlunging] = useState(false);

  function openPortal() {
    if (portalOpen || plunging) return;
    setPortalOpen(true);
  }

  function enterManager() {
    if (plunging) return;
    sessionStorage.setItem("specter:intro-entered", "1");
    setPlunging(true);
    window.setTimeout(onEnterManager, 760);
  }

  function enterEngineer() {
    if (plunging) return;
    sessionStorage.setItem("specter:intro-entered", "1");
    setPlunging(true);
    window.setTimeout(onEnterEngineer, 760);
  }

  return (
    <main className="specter-landing relative min-h-screen overflow-hidden bg-[#020711] text-white">
      <style>{`
        @keyframes specterGridDrift {
          0% { transform: rotateX(64deg) translateY(7%) scale(1); }
          100% { transform: rotateX(64deg) translateY(18%) scale(1.16); }
        }

        @keyframes specterRingPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.9; }
        }

        @keyframes specterPlunge {
          0% { transform: scale(1); filter: blur(0); opacity: 1; }
          100% { transform: scale(1.55); filter: blur(10px); opacity: 0; }
        }

        @keyframes specterTitleDevour {
          0% { transform: translateY(-8%) scale(1); opacity: 1; filter: blur(0); }
          72% { opacity: 0.9; }
          100% { transform: translateY(-54%) scale(0.12); opacity: 0; filter: blur(8px); }
        }

        @keyframes specterChoiceReveal {
          0% { opacity: 0; filter: blur(8px); }
          100% { opacity: 1; filter: blur(0); }
        }

        .specter-plunging {
          animation: specterPlunge 760ms cubic-bezier(.17,.84,.44,1) forwards;
        }

        .specter-title-devoured {
          animation: specterTitleDevour 980ms cubic-bezier(.19,1,.22,1) forwards;
        }

        .specter-choice-reveal {
          animation: specterChoiceReveal 520ms ease-out 520ms both;
        }

        .specter-grid {
          background-image:
            repeating-radial-gradient(ellipse at 50% 46%, transparent 0 28px, rgba(255,255,255,.72) 29px 31px, transparent 32px 58px),
            repeating-conic-gradient(from -4deg at 50% 46%, rgba(255,255,255,.68) 0deg 0.65deg, transparent 0.65deg 6deg);
          animation: specterGridDrift 5.8s linear infinite;
          mask-image: radial-gradient(ellipse at center, transparent 0 8%, black 11% 82%, transparent 96%);
          -webkit-mask-image: radial-gradient(ellipse at center, transparent 0 8%, black 11% 82%, transparent 96%);
        }
      `}</style>

      <div
        className={
          "relative min-h-screen transition-transform duration-500 " +
          (plunging ? "specter-plunging" : "")
        }
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_37%,rgba(36,191,122,0.2),transparent_20%),radial-gradient(circle_at_50%_52%,rgba(23,52,93,0.7),transparent_42%),linear-gradient(180deg,#07122f_0%,#020711_48%,#010306_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[#24bf7a]" />

        <div
          onClick={openPortal}
          className="group absolute inset-0 z-10 cursor-pointer overflow-hidden text-left outline-none"
        >
          <div className="absolute inset-x-[-30vw] bottom-[-30vh] top-[-4vh] [perspective:920px]">
            <div className="specter-grid absolute inset-[-18%] origin-center opacity-85 transition-all duration-700 group-hover:opacity-100" />
          </div>
          <div className="absolute left-1/2 top-[39%] h-[26vh] min-h-[160px] w-[32vw] min-w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black shadow-[0_0_34px_18px_rgba(0,0,0,1),0_0_76px_34px_rgba(36,191,122,0.22),0_0_150px_72px_rgba(23,52,93,0.42)] transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute left-1/2 top-[39%] h-[32vh] min-h-[220px] w-[45vw] min-w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[#24bf7a]/35 [animation:specterRingPulse_3.2s_ease-in-out_infinite]" />
          <div className="absolute left-1/2 top-[39%] h-[48vh] min-h-[360px] w-[70vw] min-w-[620px] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] rounded-[50%] border border-[#17345d]/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_39%,transparent_0_16%,rgba(2,7,17,0.05)_18%,rgba(2,7,17,0.82)_82%),linear-gradient(180deg,rgba(2,7,17,0.08),rgba(2,7,17,0.65))]" />

          <section
            className={
              "absolute inset-x-0 top-1/2 z-20 mx-auto flex max-w-[980px] flex-col items-center px-6 text-center " +
              (portalOpen ? "specter-title-devoured" : "-translate-y-[8%]")
            }
          >
            <SpecterLandingMark />
            <h1 className="mt-6 font-serif text-[82px] font-bold leading-[0.88] tracking-normal text-white drop-shadow-[0_10px_40px_rgba(0,0,0,0.65)] md:text-[148px]">
              Specter
            </h1>
            <div className="mt-5 inline-flex rounded-[8px] border border-[#24bf7a]/35 bg-[#24bf7a]/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.22em] text-[#24bf7a] backdrop-blur-md">
              Know where the line is
            </div>
            <p className="mt-5 max-w-[620px] text-[16px] font-semibold leading-relaxed text-white/72">
              Define the line, test the signal, and see when a pilot starts bending out of shape.
            </p>
            <div className="mt-8 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-[#24bf7a]">
              Open governance field <ArrowRight className="h-4 w-4" />
            </div>
          </section>

          {portalOpen && (
            <section className="specter-choice-reveal absolute inset-x-0 top-1/2 z-30 mx-auto grid max-w-[1180px] -translate-y-1/2 grid-cols-1 gap-5 px-6 md:grid-cols-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  enterManager();
                }}
                className="group/choice rounded-[10px] border border-[#24bf7a]/28 bg-[#07122f]/74 p-6 text-left shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-md transition-transform hover:-translate-y-1 hover:border-[#24bf7a]/70"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#24bf7a]">
                  Manager
                </div>
                <div className="mt-3 font-sans text-[34px] font-black leading-none text-white">
                  Commitment series
                </div>
                <p className="mt-4 max-w-[420px] text-[14px] font-semibold leading-relaxed text-white/65">
                  Define the affordable-loss line, generate the commitment, and run governance
                  check-ins.
                </p>
                <div className="mt-6 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-[#24bf7a]">
                  Enter manager flow <ArrowRight className="h-4 w-4" />
                </div>
              </button>

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  enterEngineer();
                }}
                className="group/choice rounded-[10px] border border-white/14 bg-white/10 p-6 text-left shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-md transition-transform hover:-translate-y-1 hover:border-white/45"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
                  Engineer
                </div>
                <div className="mt-3 font-sans text-[34px] font-black leading-none text-white">
                  Experiment series
                </div>
                <p className="mt-4 max-w-[420px] text-[14px] font-semibold leading-relaxed text-white/65">
                  Shape a small bet, test the evidence, and decide whether the idea deserves a
                  handoff.
                </p>
                <div className="mt-6 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-white">
                  Enter engineer flow <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            </section>
          )}
        </div>
      </div>
    </main>
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
