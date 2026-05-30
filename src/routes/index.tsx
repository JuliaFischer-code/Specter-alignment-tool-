import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, PageHeader } from "@/components/app-shell";
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
      { title: "Uncertainty Navigator — Define Affordable Loss" },
      {
        name: "description",
        content:
          "A structured conversation that helps teams define affordable loss before starting an AI pilot.",
      },
      { property: "og:title", content: "Uncertainty Navigator" },
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
    () =>
      promptScript.filter((p) => answers[p.id].trim().length > 0).length,
    [answers],
  );

  const update = (v: string) =>
    setAnswers((a) => ({ ...a, [current.id]: v }));

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
      // Extract text from PDF using FileReader + pdf.js-style base64
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Convert to base64 to send to server
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      // We send the raw base64; the server fn will extract text via a simple approach
      // For now we use a text extraction fallback: try to decode readable strings
      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      const rawText = textDecoder.decode(uint8);

      // Clean up binary noise — keep readable ASCII runs of 4+ chars
      const pdfText = rawText
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/ {3,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 12000); // cap to avoid token overflow

      if (pdfText.length < 100) {
        throw new Error(
          "Could not extract readable text from this PDF. Try a text-based PDF (not a scanned image).",
        );
      }

      const result = await runExtract({ data: { pdfText } });

      // Merge extracted answers into state (only overwrite if non-empty)
      setAnswers((prev) => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(result.answers)) {
          if (val && val.trim().length > 0) {
            (next as any)[key] = val;
          }
        }
        return next;
      });

      setMissingFromPdf(result.missing);

      // Jump to first missing question if any, otherwise step 0
      if (result.missing.length > 0) {
        const firstMissingIndex = promptScript.findIndex((p) =>
          result.missing.includes(p.id),
        );
        if (firstMissingIndex >= 0) setStep(firstMissingIndex);
      }
    } catch (err: any) {
      setPdfError(err?.message || "PDF extraction failed.");
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
      <PageHeader
        eyebrow="Screen 01 · Pre-commitment conversation"
        title="Decide what you can afford to lose — before the pilot starts."
        lede="Affordable Loss is the disciplined alternative to expected return. Walk through nine questions; the answers become a written commitment your steering committee can hold you to."
      />

      <section className="mx-auto max-w-[1240px] px-8">
        <div className="grid grid-cols-12 gap-10">
          {/* Side rail */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="hairline pt-6">
              <div className="eyebrow mb-4">Question set</div>
              <ol className="space-y-1">
                {promptScript.map((p, i) => {
                  const done = answers[p.id].trim().length > 0;
                  const active = i === step;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => setStep(i)}
                        className={
                          "group flex w-full items-start gap-3 border-l-2 py-2 pl-3 pr-2 text-left text-[13px] transition-colors " +
                          (active
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground")
                        }
                      >
                        <span className="number-tag w-6 shrink-0">
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
              <div className="mt-8 border-t border-border pt-4 text-[12px] text-muted-foreground">
                {progress} of {total} answered
              </div>
            </div>
          </aside>

          {/* Conversation panel */}
          <div className="col-span-12 lg:col-span-8">

            {/* PDF Upload Banner */}
            <div className="mb-4 border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="eyebrow mb-1">Import from document</div>
                  <p className="text-[12px] text-muted-foreground">
                    Upload a PDF and we'll pre-fill what we can find. Missing answers will be flagged in red.
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
                      "cursor-pointer border border-border px-4 py-2 text-[12px] font-mono uppercase tracking-wider transition-colors " +
                      (pdfUploading
                        ? "opacity-50 pointer-events-none bg-muted text-muted-foreground"
                        : "bg-background text-foreground hover:border-foreground/60")
                    }
                  >
                    {pdfUploading ? "Extracting…" : "Upload PDF"}
                  </label>
                </div>
              </div>

              {pdfFileName && !pdfUploading && !pdfError && (
                <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{pdfFileName} imported</span>
                  {missingFromPdf.length > 0 && (
                    <span className="text-destructive">
                      · {missingFromPdf.length} question{missingFromPdf.length > 1 ? "s" : ""} not found in document
                    </span>
                  )}
                </div>
              )}

              {pdfError && (
                <p className="mt-3 text-[12px] text-destructive">{pdfError}</p>
              )}
            </div>

            <div className="border border-border bg-card p-10">
              <div className="flex items-center justify-between">
                <span className="number-tag">
                  Question {String(step + 1).padStart(2, "0")} / {total}
                </span>
                <button
                  onClick={loadSample}
                  className="text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Load worked example
                </button>
              </div>

              <h2 className="mt-6 font-serif text-[36px] leading-[1.1]">
                {current.question}
              </h2>
              <p className="mt-3 text-[14px] italic text-muted-foreground">
                {current.hint}
              </p>

              <textarea
                value={value}
                onChange={(e) => update(e.target.value)}
                placeholder={current.placeholder}
                rows={6}
                className="mt-8 w-full resize-none border border-border bg-background p-4 text-[15px] leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
                autoFocus
              />

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-3">
                  {step < total - 1 ? (
                    <button
                      onClick={next}
                      className="bg-primary px-6 py-3 text-[13px] font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Next question →
                    </button>
                  ) : (
                    <button
                      onClick={() => finalize(answers)}
                      className="bg-primary px-6 py-3 text-[13px] font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Generate commitment document →
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6 flex gap-1">
              {promptScript.map((_, i) => (
                <div
                  key={i}
                  className={
                    "h-px flex-1 transition-colors " +
                    (i <= step ? "bg-primary" : "bg-border")
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="h-24" />
    </AppShell>
  );
}
