// Turns the backend `feedback` payload (see backend/answer_feedback_service.py)
// into what the review, retake and recap screens render. Pure functions only.
//
// Honesty rules (from the V2.2 design review):
// - never invent a correction, category, or "not heard" mark the backend did not send;
// - pace and hesitations are descriptive (neutral colour), not judgements;
// - pronunciation is never scored from text.

const FILLERS = new Set(["um", "umm", "uh", "uhh", "er", "erm", "hmm", "ah", "eh"]);

const KIND_CHIPS = {
  relevant: { tone: "mint", text: "On topic" },
  off_topic: { tone: "rose", text: "Off topic" },
  insufficient: { tone: "amber", text: "Too short to judge" },
  transcript_uncertain: { tone: "amber", text: "Check the transcript" },
  clarification: { tone: "neutral", text: "You asked for help" },
  instruction: { tone: "neutral", text: "Not an answer yet" },
  system_copy: { tone: "amber", text: "Use your own words" },
};

const PACE_TEXT = {
  slow: "Pace: a bit slow",
  good: "Pace: natural",
  fast: "Pace: a bit fast",
};

export function verdictChips(feedback) {
  if (!feedback) return [];
  const chips = [];
  const kindChip = feedback.coaching ? KIND_CHIPS[feedback.kind] : null;
  if (kindChip) chips.push({ ...kindChip, icon: feedback.kind === "relevant" ? "✓" : "" });
  if (feedback.pace) {
    const wpm = feedback.words_per_minute ? ` · ${Math.round(feedback.words_per_minute)} wpm` : "";
    chips.push({ tone: "neutral", text: `${PACE_TEXT[feedback.pace]}${wpm}` });
  }
  if (feedback.hesitations?.length !== undefined && feedback.pace) {
    const count = feedback.hesitation_count || 0;
    chips.push({ tone: "neutral", text: count === 1 ? "1 hesitation" : `${count} hesitations` });
  }
  return chips;
}

function splitWords(text) {
  return String(text || "").split(/(\s+)/).filter((part) => part.length > 0);
}

function fillerAware(text) {
  return splitWords(text).map((part) => {
    const bare = part.toLowerCase().replace(/[^a-z']/g, "");
    if (bare && FILLERS.has(bare)) return { type: "filler", text: part };
    return { type: "text", text: part };
  });
}

// Returns a flat list of segments: text | filler | del | ins | quote | fix.
export function transcriptSegments(answer, feedback) {
  const edits = feedback?.edits || [];
  if (edits.length) {
    const segments = [];
    edits.forEach((edit, index) => {
      const spacer = index > 0 ? [{ type: "text", text: " " }] : [];
      if (edit.op === "equal") segments.push(...spacer, ...fillerAware(edit.text));
      if (edit.op === "delete") segments.push(...spacer, { type: "del", text: edit.text });
      if (edit.op === "insert") segments.push(...spacer, { type: "ins", text: edit.text });
      if (edit.op === "replace") {
        segments.push(...spacer, { type: "del", text: edit.text }, { type: "text", text: " " }, { type: "ins", text: edit.replacement || "" });
      }
    });
    return tidyPunctuation(segments);
  }
  const correction = feedback?.correction;
  if (correction?.quote && correction.quote_in_answer) {
    const pattern = new RegExp(`(?<![\\w])${escapeRegExp(correction.quote)}(?![\\w])`, "i");
    const match = String(answer || "").match(pattern);
    if (match && match.index !== undefined) {
      const before = answer.slice(0, match.index);
      const after = answer.slice(match.index + match[0].length);
      return [
        ...fillerAware(before),
        { type: "del", text: match[0] },
        { type: "text", text: " " },
        { type: "ins", text: correction.replacement || "" },
        ...fillerAware(after),
      ];
    }
  }
  return fillerAware(answer);
}

function tidyPunctuation(segments) {
  // difflib tokens put spaces before punctuation; remove them for display.
  const out = [];
  segments.forEach((segment) => {
    const previous = out[out.length - 1];
    if (segment.type === "text" && /^[,.!?;:]/.test(segment.text) && previous?.type === "text" && previous.text === " ") {
      out.pop();
    }
    out.push(segment);
  });
  return out;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasMarks(feedback) {
  return Boolean(feedback?.edits?.some((edit) => edit.op !== "equal") || feedback?.correction?.quote_in_answer);
}

// The one thing shown open on the review screen.
export function topFix(feedback) {
  if (!feedback?.coaching) return null;
  const correction = feedback.correction;
  if (correction?.replacement) {
    return {
      label: "Top fix",
      from: correction.quote,
      to: correction.replacement,
      sentence: correction.sentence,
      listen: correction.replacement,
    };
  }
  if (correction?.sentence) {
    return { label: "Top fix", sentence: correction.sentence, listen: null };
  }
  if (feedback.tip) {
    return { label: "Next step", sentence: feedback.tip, listen: null };
  }
  return null;
}

export function countHesitations(text) {
  const words = (String(text || "").match(/[A-Za-z']+/g) || []).map((word) => word.toLowerCase());
  let count = 0;
  words.forEach((word, index) => {
    if (FILLERS.has(word)) count += 1;
    else if (index > 0 && word === words[index - 1] && !["very", "really", "so"].includes(word)) count += 1;
  });
  return count;
}

// Retake: compared locally with the first try. The session is NOT advanced
// and nothing is sent to the coaching model.
export function compareRetake(turn, retake) {
  const first = {
    words: turn.feedback?.word_count ?? countWordsLocal(turn.answer),
    duration: turn.duration || null,
    hesitations: turn.feedback?.hesitation_count ?? countHesitations(turn.answer),
  };
  const second = {
    words: countWordsLocal(retake.text),
    duration: retake.duration || null,
    hesitations: countHesitations(retake.text),
  };
  const rows = [];
  const lengthBetter = second.words > first.words;
  rows.push({
    key: "length",
    label: "Length",
    first: lengthText(first),
    second: lengthText(second),
    improved: lengthBetter,
  });
  rows.push({
    key: "hesitations",
    label: "Hesitations",
    first: String(first.hesitations),
    second: String(second.hesitations),
    improved: second.hesitations < first.hesitations,
  });
  const fix = topFix(turn.feedback);
  if (fix?.to) {
    const used = includesPhrase(retake.text, fix.to);
    const stillOld = fix.from ? includesPhrase(retake.text, fix.from) : false;
    rows.push({
      key: "fix",
      label: "Fix #1",
      first: fix.from ? `“${fix.from}”` : "—",
      second: used && !stillOld ? `“${fix.to}”` : stillOld ? `“${fix.from}”` : "Not used",
      improved: used && !stillOld,
    });
  }
  const improvedCount = rows.filter((row) => row.improved).length;
  return { rows, improvedCount, total: rows.length };
}

function lengthText({ words, duration }) {
  return duration ? `${words} words · ${Math.round(duration)}s` : `${words} words`;
}

function countWordsLocal(text) {
  return (String(text || "").match(/[A-Za-z']+/g) || []).length;
}

function includesPhrase(text, phrase) {
  const pattern = new RegExp(`(?<![\\w])${escapeRegExp(String(phrase).trim())}(?![\\w])`, "i");
  return pattern.test(String(text || ""));
}

export function retakeHeadline(comparison) {
  if (!comparison.total) return "Nice try";
  if (comparison.improvedCount === 0) return "Same as before — try once more?";
  if (comparison.improvedCount === comparison.total) return "You got everything right this time";
  return `You got ${comparison.improvedCount} of ${comparison.total} right this time`;
}
