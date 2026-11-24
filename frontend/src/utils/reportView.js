// Parses the existing Markdown report (backend/report_service.py) into recap
// cards. The report prompt and fallback are unchanged; if parsing fails the
// recap screen falls back to showing the raw text.

function sections(markdown) {
  const map = new Map();
  let current = "_intro";
  map.set(current, []);
  String(markdown || "").split(/\r?\n/).forEach((line) => {
    const heading = line.match(/^#{2,3}\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1].toLowerCase();
      if (!map.has(current)) map.set(current, []);
      return;
    }
    if (/^---\s*$/.test(line)) return;
    map.get(current).push(line);
  });
  return map;
}

function find(map, ...needles) {
  for (const [key, lines] of map.entries()) {
    if (needles.some((needle) => key.includes(needle))) return lines;
  }
  return [];
}

function clean(text) {
  return String(text || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*(?:[-*]|\d+\.)\s*/, "").trim();
}

function listItems(lines) {
  return lines.map((line) => line.trim()).filter((line) => /^(?:[-*]|\d+\.)\s+/.test(line)).map(clean).filter(Boolean);
}

function paragraph(lines) {
  return lines.map((line) => line.trim()).filter(Boolean).map(clean).join(" ");
}

const CRITERIA = [
  { key: "fluency", title: "Fluency", match: /fluency/i },
  { key: "vocabulary", title: "Vocabulary", match: /lexical|vocabulary/i },
  { key: "grammar", title: "Grammar", match: /grammar/i },
];

function criteria(lines) {
  const items = lines.map((line) => line.trim()).filter(Boolean);
  const result = CRITERIA.map((criterion) => {
    const line = items.find((item) => criterion.match.test(item.split(":")[0] || ""));
    const comment = line ? clean(line).replace(/^[^:]+:\s*/, "") : "";
    return { ...criterion, comment };
  });
  result.push({
    key: "pronunciation",
    title: "Pronunciation",
    comment: "Can't be judged from text.",
    muted: true,
  });
  return result;
}

function examples(lines) {
  const out = [];
  let pending = null;
  lines.forEach((raw) => {
    const line = raw.replace(/^>\s?/, "").trim();
    const original = line.match(/^Original:\s*(.+)$/i);
    const better = line.match(/^Better:\s*(.+)$/i);
    if (original) pending = { original: original[1].trim(), better: "" };
    if (better && pending) {
      pending.better = better[1].trim();
      if (!/not available/i.test(pending.original)) out.push(pending);
      pending = null;
    }
  });
  return out;
}

function boldValue(lines, label) {
  const pattern = new RegExp(`\\*\\*${label}:?\\*\\*:?\\s*(.+)`, "i");
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) return clean(match[1]);
  }
  return "";
}

export function parseReport(markdown) {
  const map = sections(markdown);
  const bandLines = find(map, "overall band");
  const summary = find(map, "session learning summary");
  const problems = listItems(find(map, "recurring"));
  const tasks = listItems(find(map, "practice tasks"));
  const focus = boldValue(summary, "Next-session focus");
  const band = paragraph(bandLines);
  const oneThing = focus || problems[0] || tasks[0] || "";
  const parsed = {
    band,
    oneThing,
    criteria: criteria(find(map, "skill breakdown")),
    problems,
    examples: examples(find(map, "corrected examples")),
    tasks,
    evidence: boldValue(summary, "Evidence used"),
  };
  parsed.ok = Boolean(band || problems.length || tasks.length);
  return parsed;
}
