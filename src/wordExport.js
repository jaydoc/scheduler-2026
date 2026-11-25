// =====================================================================
//  Builds the group's Word document (same layout as the 2026/2027 shell):
//  title, revision date, month pairs in two-column tables with yellow
//  headings that list the on-service attendings, weekend lines
//  "date  RNI/COA", and a Weekend Totals table with no blank cells.
// =====================================================================
import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import {
  YEAR, WEEKENDS, FIXED_BLOCKS, ON_SERVICE, MONTH_KEYS, MONTH_FULL, ATTENDINGS,
} from "./config.js";

const ARIAL = "Arial";
const YELLOW = "FFFF00";
const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borders = { top: border, bottom: border, left: border, right: border };

const run = (text, opts = {}) => new TextRun({ text, font: ARIAL, size: 23, ...opts });

function monthHeading(mk) {
  const os = ON_SERVICE[mk] || { RNI: [], COA: [] };
  const names = [...new Set([...os.RNI, ...os.COA])];
  const label = MONTH_FULL[MONTH_KEYS.indexOf(mk)].toUpperCase();
  return names.length ? `${label} (${names.join("/")})` : label;
}

function weekendLines(mk, schedule) {
  const items = [
    ...WEEKENDS.filter((w) => w.month === mk).map((w) => ({ ...w, ...(schedule[w.date] || {}), fixed: false })),
    ...FIXED_BLOCKS.filter((b) => b.month === mk).map((b) => ({ ...b, RNI: b.rni, COA: b.coa, fixed: true, paid: true })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return items.map((w) => {
    const boldDetail = w.paid || w.fixed;
    const runs = [run(w.day, { bold: true })];
    if (w.detail) runs.push(run(` (${w.detail})`, { bold: boldDetail }));
    runs.push(run(`   ${w.RNI || "____"}/${w.COA || "____"}`));
    return new Paragraph({ children: runs, spacing: { after: 0 } });
  });
}

function cell(children, width, fill) {
  return new TableCell({
    children,
    width: { size: width, type: WidthType.DXA },
    borders,
    shading: fill ? { type: ShadingType.CLEAR, color: "auto", fill } : undefined,
    margins: { left: 80, right: 80 },
  });
}

function monthPairTable(mkA, mkB, schedule) {
  const W1 = 5490, W2 = 6120;
  const head = (mk) => [new Paragraph({ children: [run(monthHeading(mk), { bold: true })] })];
  return new Table({
    width: { size: W1 + W2, type: WidthType.DXA },
    columnWidths: [W1, W2],
    indent: { size: -612, type: WidthType.DXA },
    rows: [
      new TableRow({ children: [cell(head(mkA), W1, YELLOW), cell(head(mkB), W2, YELLOW)] }),
      new TableRow({ children: [cell(weekendLines(mkA, schedule), W1), cell(weekendLines(mkB, schedule), W2)] }),
    ],
  });
}

/** Weekend totals: assigned regular weekends only (holiday blocks excluded). */
export function weekendTotals(schedule) {
  const counts = Object.fromEntries(ATTENDINGS.map((a) => [a.name, 0]));
  for (const w of WEEKENDS) {
    const d = schedule[w.date] || {};
    for (const s of ["RNI", "COA"]) if (d[s] && d[s] in counts) counts[d[s]] += 1;
  }
  return counts;
}

function totalsTable(schedule) {
  const counts = weekendTotals(schedule);
  const names = Object.keys(counts).sort();
  const cols = 6;
  const rows = Math.ceil(names.length / cols);
  const cw = 1800;
  const tnr = (text, opts = {}) => new TextRun({ text, font: "Times New Roman", size: 22, ...opts });
  const out = [
    new TableRow({
      children: [new TableCell({
        columnSpan: cols, borders,
        shading: { type: ShadingType.CLEAR, color: "auto", fill: YELLOW },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [tnr("Weekend Totals", { bold: true })] })],
      })],
    }),
  ];
  // fill column by column so names read alphabetically down each column
  for (let r = 0; r < rows; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      const n = names[c * rows + r];
      cells.push(new TableCell({
        borders, width: { size: cw, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: YELLOW },
        children: [new Paragraph({ children: [tnr(n ? `${n} = ${counts[n]}` : "")] })],
      }));
    }
    out.push(new TableRow({ children: cells }));
  }
  return new Table({ alignment: AlignmentType.CENTER, columnWidths: Array(cols).fill(cw), rows: out });
}

export function buildWeekendDocument(schedule, revDate = new Date()) {
  const rev = `${revDate.getMonth() + 1}/${revDate.getDate()}/${revDate.getFullYear()}`;
  const spacer = () => new Paragraph({ children: [run("", { size: 10 })], spacing: { after: 0 } });
  const body = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [run(`${YEAR} ATTENDING WEEKEND SCHEDULE`, { bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [run("(UAB RNICU-BPD/COA QB-H)", { bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(`Rev.   ${rev}`, { size: 21 })] }),
  ];
  for (let i = 0; i < 12; i += 2) {
    body.push(monthPairTable(MONTH_KEYS[i], MONTH_KEYS[i + 1], schedule));
    body.push(spacer());
  }
  body.push(totalsTable(schedule));
  return new Document({
    styles: { default: { document: { run: { font: ARIAL } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 720, right: 1080, bottom: 245, left: 1080 } } },
      children: body,
    }],
  });
}

export async function weekendDocBlob(schedule, revDate) {
  return Packer.toBlob(buildWeekendDocument(schedule, revDate));
}

export async function weekendDocBuffer(schedule, revDate) {
  return Packer.toBuffer(buildWeekendDocument(schedule, revDate));
}
