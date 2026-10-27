// Only the fixed feedback labels emitted by build_reply are playable.
export function splitFeedbackPlayback(content) {
  const paragraphs = String(content || "").replace(/\r\n/g, "\n").split(/\n\s*\n/);
  const sections = [];
  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];
    const inline = paragraph.match(/^\*\*(Quick correction|Better expression|Natural version):\*\*\s*(.+)$/s);
    const natural = /^\*\*A natural version of your answer:\*\*\s*$/.test(paragraph.trim());
    if (inline) {
      sections.push({ content: paragraph, text: cleanSpeechText(inline[2]), label: inline[1] });
    } else if (natural && /^>\s?/.test(paragraphs[index + 1] || "")) {
      const quote = paragraphs[++index];
      sections.push({ content: `${paragraph}\n\n${quote}`, text: cleanSpeechText(quote), label: "Natural version" });
    } else {
      sections.push({ content: paragraph, text: "" });
    }
  }
  return sections;
}

function cleanSpeechText(text) {
  return text.replace(/^>\s?/gm, "").replace(/\*\*|`/g, "").trim();
}
