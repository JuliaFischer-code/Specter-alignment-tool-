import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, FileText, Printer, ShieldCheck, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { type CommitmentData, useCheckIns, useCommitment } from "@/lib/commitment-store";

export const Route = createFileRoute("/commitment")({
  head: () => ({
    meta: [
      { title: "Commitment Document — Uncertainty Navigator" },
      {
        name: "description",
        content: "The signed commitment generated from your affordable-loss conversation.",
      },
      { property: "og:title", content: "Commitment Document" },
      {
        property: "og:description",
        content: "A one-page commitment generated from your pre-pilot conversation.",
      },
    ],
  }),
  component: CommitmentPage,
});

const sections: {
  title: string;
  fields: { id: keyof Omit<CommitmentData, "createdAt">; label: string }[];
}[] = [
  {
    title: "I. Identification",
    fields: [
      { id: "pilotName", label: "Pilot" },
      { id: "sponsor", label: "Accountable Sponsor" },
    ],
  },
  {
    title: "II. Hypothesis",
    fields: [{ id: "hypothesis", label: "Falsifiable Claim" }],
  },
  {
    title: "III. Affordable Loss",
    fields: [
      { id: "budgetCeiling", label: "Budget Ceiling" },
      { id: "timeBox", label: "Time-box" },
      { id: "reputationalRisk", label: "Reputational Exposure" },
      { id: "opportunityCost", label: "Opportunity Cost" },
    ],
  },
  {
    title: "IV. Decision Gates",
    fields: [
      { id: "killCriteria", label: "Kill Criteria" },
      { id: "successSignals", label: "Continue Signals" },
    ],
  },
];

function CommitmentPage() {
  const { data, hydrated } = useCommitment();
  const { checkIns } = useCheckIns();

  if (!hydrated)
    return (
      <AppShell>
        <div className="h-screen" />
      </AppShell>
    );

  if (!data || !data.createdAt) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1240px] px-8 py-32 text-center">
          <div className="eyebrow">No commitment on file</div>
          <h1 className="mt-4 font-serif text-[40px]">Start the conversation first.</h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            The commitment document is generated from your answers in Screen 01.
          </p>
          <Link
            to="/"
            className="mt-8 inline-block bg-primary px-6 py-3 text-[13px] text-primary-foreground hover:opacity-90"
          >
            Begin conversation →
          </Link>
        </div>
      </AppShell>
    );
  }

  const created = new Date(data.createdAt);
  const docId = "UN-" + created.getTime().toString(36).toUpperCase().slice(-6);
  const latestCheckIn = checkIns.at(-1);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1340px] px-6 py-8">
        <div className="mb-6 grid grid-cols-1 gap-5 rounded-[8px] bg-[#07122f] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] xl:grid-cols-[1fr_420px]">
          <div>
            <div className="mb-4 inline-flex rounded-[8px] bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#24bf7a]">
              Manager · Step 02 · Commitment
            </div>
            <h1 className="max-w-[780px] font-sans text-[52px] font-black leading-[0.98] tracking-normal text-white md:text-[72px]">
              Pilot Commitment Document
            </h1>
            <p className="mt-5 max-w-[700px] text-[16px] leading-relaxed text-white/70">
              The written affordable-loss envelope managers can review, print, and check against
              throughout the pilot.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            <CommitmentHeroMetric label="Check-ins" value={checkIns.length} />
            <CommitmentHeroMetric
              label="Latest"
              value={latestCheckIn ? latestCheckIn.verdict : "New"}
            />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-[8px] bg-white px-4 py-2.5 text-[13px] font-bold text-[#07122f] shadow-[0_12px_32px_rgba(15,23,42,0.06)] hover:bg-[#f7f5f4]"
          >
            <Printer className="h-4 w-4" />
            Print / Export PDF
          </button>
          <Link
            to="/check-in"
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#24bf7a] px-4 py-2.5 text-[13px] font-bold text-[#07122f] shadow-[0_12px_32px_rgba(15,23,42,0.06)] hover:opacity-90"
          >
            Run check-in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <article className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-5">
            <div className="rounded-[8px] bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
                <ShieldCheck className="h-4 w-4 text-[#24bf7a]" />
                Envelope
              </div>
              <div className="space-y-3">
                <CommitmentMeta icon={FileText} label="Document" value={docId} />
                <CommitmentMeta icon={UserRound} label="Sponsor" value={data.sponsor || "—"} />
                <CommitmentMeta icon={CalendarClock} label="Time-box" value={data.timeBox || "—"} />
              </div>
            </div>

            <div className="rounded-[8px] bg-[#07122f] p-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
                Review status
              </div>
              <div className="mt-3 text-[38px] font-black leading-none">
                {latestCheckIn ? latestCheckIn.verdict.replace("-", " ") : "Ready"}
              </div>
              <p className="mt-4 text-[13px] font-medium leading-relaxed text-white/65">
                {latestCheckIn
                  ? `Last checked ${created.toLocaleDateString("de-DE")}.`
                  : "No check-in recorded yet."}
              </p>
            </div>
          </aside>

          <div className="rounded-[8px] bg-white p-8 shadow-[0_18px_48px_rgba(15,23,42,0.06)] lg:p-10">
            {/* Doc header */}
            <div className="grid grid-cols-12 gap-8 border-b border-[#e4e0de] pb-8">
              <div className="col-span-12 md:col-span-7">
                <div className="font-mono text-[12px] font-bold text-[#08764c]">{docId}</div>
                <h2 className="mt-3 font-sans text-[40px] font-black leading-[1.05] tracking-normal text-[#07122f]">
                  {data.pilotName || "Untitled pilot"}
                </h2>
                <p className="mt-3 max-w-xl text-[14px] font-medium leading-relaxed text-[#697081]">
                  This document records the team's pre-commitment to an affordable loss. It
                  supersedes informal expectations and is the reference used at every check-in.
                </p>
              </div>
              <div className="col-span-12 space-y-4 text-[12px] md:col-span-5">
                <Meta
                  label="Issued"
                  value={created.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
                <Meta label="Sponsor" value={data.sponsor || "—"} />
                <Meta label="Time-box" value={data.timeBox || "—"} />
                <Meta label="Ceiling" value={data.budgetCeiling || "—"} />
              </div>
            </div>

            {/* Body */}
            <div className="mt-10 space-y-12">
              {sections.map((s) => (
                <section key={s.title}>
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#a1a6b3]">
                    {s.title}
                  </h3>
                  <div className="mt-5 divide-y divide-[#e4e0de] rounded-[8px] bg-[#f7f5f4]">
                    {s.fields.map((f) => (
                      <div key={f.id} className="grid grid-cols-12 gap-6 py-5">
                        <div className="col-span-12 md:col-span-3">
                          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
                            {f.label}
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-9">
                          <p className="text-[15px] font-medium leading-relaxed text-[#07122f]">
                            {data[f.id] || (
                              <span className="italic text-[#697081]">Not specified</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Signature */}
            <div className="mt-16 grid grid-cols-1 gap-12 border-t border-[#e4e0de] pt-10 md:grid-cols-2">
              <SignatureBlock label="Sponsor" name={data.sponsor} />
              <SignatureBlock label="Pilot Lead" name="" />
            </div>
          </div>
        </article>
      </div>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#e4e0de] pb-2">
      <span className="font-mono uppercase tracking-wider text-[#697081]">{label}</span>
      <span className="text-right font-semibold text-[#07122f]">{value}</span>
    </div>
  );
}

function SignatureBlock({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <div className="h-12 border-b border-[#07122f]/40" />
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a1a6b3]">
          {label}
        </span>
        <span className="text-[13px] font-semibold text-[#07122f]">{name || "—"}</span>
      </div>
    </div>
  );
}

function CommitmentHeroMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[8px] bg-white p-4 text-[#07122f]">
      <div className="truncate text-[34px] font-black leading-none capitalize">{value}</div>
      <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[#8d93a1]">
        {label}
      </div>
    </div>
  );
}

function CommitmentMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[8px] bg-[#f7f5f4] p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#24bf7a]" />
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a1a6b3]">
          {label}
        </div>
        <div className="mt-1 truncate text-[13px] font-bold text-[#07122f]">{value}</div>
      </div>
    </div>
  );
}
