import type { IdeaCard } from "./team-store";

type BriefAnswer = {
  label: string;
  value: string;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 54;
const TOP = 736;
const LINE_HEIGHT = 14;
const MAX_LINE_CHARS = 92;

function sanitizePdfText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, (char) => {
      const replacements: Record<string, string> = {
        "—": "-",
        "–": "-",
        "→": "->",
        "✓": "check",
        "✕": "x",
        "⏸": "pause",
        "≥": ">=",
        "≤": "<=",
        "€": "EUR",
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
      };
      return replacements[char] ?? " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfString(text: string) {
  return sanitizePdfText(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars = MAX_LINE_CHARS) {
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function buildBriefAnswers(idea: IdeaCard): BriefAnswer[] {
  const latestCheckIn = idea.checkIns.at(-1);
  const evidence = latestCheckIn
    ? `Latest team evidence: ${latestCheckIn.learning}`
    : "No check-in evidence has been recorded yet.";
  const blindspot = idea.mentorEvaluation?.biggestBlindspot;

  return [
    {
      label: "1. What are we calling this pilot?",
      value: idea.problem,
    },
    {
      label: "2. Who is the accountable sponsor?",
      value: `Sponsor to assign. Originating engineer: ${idea.author}. Affected group: ${idea.whoHasIt}.`,
    },
    {
      label: "3. What do you believe AI will change here?",
      value: `We believe that ${idea.experiment} can reduce the pain described as: ${idea.problem}`,
    },
    {
      label: "4. What is the most you can afford to lose?",
      value: `Initial affordable loss stated by the team: ${idea.willingToRisk}. Manager should confirm any additional budget, data access, or operational exposure before expansion.`,
    },
    {
      label: "5. How long before you walk away?",
      value:
        "The team framed this as a one-week experiment. If promoted to a managed pilot, keep the first management review within 4 to 6 weeks.",
    },
    {
      label: "6. What is the reputational exposure?",
      value: blindspot
        ? `Primary risk to manage: ${blindspot}. Keep exposure limited to ${idea.whoHasIt} until the manager approves a broader rollout.`
        : `Keep exposure limited to ${idea.whoHasIt} until the manager approves a broader rollout.`,
    },
    {
      label: "7. What are you choosing not to do?",
      value: `Continuing this pilot means spending time on: ${idea.experiment}. The initial opportunity cost/risk named by the team was: ${idea.willingToRisk}.`,
    },
    {
      label: "8. What would make you stop early?",
      value: `Stop if: ${idea.stopSignal}`,
    },
    {
      label: "9. What does 'worth continuing' look like?",
      value: `Worth continuing if: ${idea.goSignal}. ${evidence}`,
    },
  ];
}

function createPdfLines(idea: IdeaCard) {
  const lines: { text: string; size: number; gapAfter?: number }[] = [
    { text: "Pilot Commitment Brief", size: 20, gapAfter: 8 },
    { text: `Generated for manager intake from team experiment ${idea.id}`, size: 9, gapAfter: 18 },
    { text: "Team Experiment", size: 13, gapAfter: 6 },
    { text: `Author: ${idea.author}`, size: 10 },
    { text: `Status: ${idea.status}`, size: 10 },
    { text: `Mentor verdict: ${idea.mentorEvaluation?.verdict ?? "not evaluated"}`, size: 10 },
  ];

  if (idea.mentorEvaluation?.verdictReason) {
    lines.push({ text: `Verdict reason: ${idea.mentorEvaluation.verdictReason}`, size: 10 });
  }

  lines.push(
    { text: "", size: 10, gapAfter: 10 },
    { text: "Nine Manager Questions", size: 13, gapAfter: 6 },
  );

  for (const answer of buildBriefAnswers(idea)) {
    lines.push({ text: answer.label, size: 11, gapAfter: 3 });
    for (const line of wrapText(answer.value)) {
      lines.push({ text: line, size: 10 });
    }
    lines.push({ text: "", size: 10, gapAfter: 7 });
  }

  lines.push({ text: "Check-in Evidence", size: 13, gapAfter: 6 });

  if (idea.checkIns.length === 0) {
    lines.push({ text: "No check-ins recorded yet.", size: 10 });
  } else {
    for (const checkIn of idea.checkIns) {
      lines.push({
        text: `${new Date(checkIn.createdAt).toLocaleDateString()} - ${checkIn.decision.toUpperCase()}`,
        size: 10,
        gapAfter: 3,
      });
      for (const line of wrapText(checkIn.learning)) {
        lines.push({ text: line, size: 10 });
      }
      lines.push({ text: "", size: 10, gapAfter: 5 });
    }
  }

  return lines;
}

function buildPdf(idea: IdeaCard) {
  const sourceLines = createPdfLines(idea);
  const pages: string[][] = [[]];
  let y = TOP;

  for (const line of sourceLines) {
    const gap = line.gapAfter ?? 0;
    if (y < 72) {
      pages.push([]);
      y = TOP;
    }

    pages[pages.length - 1].push(
      `BT /F1 ${line.size} Tf ${LEFT} ${y} Td (${escapePdfString(line.text)}) Tj ET`,
    );
    y -= LINE_HEIGHT + gap;
  }

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  ];

  for (let i = 0; i < pages.length; i++) {
    const pageObjectNumber = 3 + i * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    const stream = pages[i].join("\n");

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function filenameForIdea(idea: IdeaCard) {
  const slug = sanitizePdfText(idea.problem)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `manager-brief-${slug || idea.id}.pdf`;
}

export function downloadManagerBriefPdf(idea: IdeaCard) {
  const pdf = buildPdf(idea);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filenameForIdea(idea);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
