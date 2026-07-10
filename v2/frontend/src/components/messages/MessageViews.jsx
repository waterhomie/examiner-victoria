function renderInline(text, keyPrefix) {
  return String(text || "")
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`;
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={key}>{part.slice(1, -1)}</code>;
      }
      return <span key={key}>{part}</span>;
    });
}

export function RichMessage({ content }) {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  const isHeading = (line) => /^#{1,4}\s+/.test(line.trim());
  const isRule = (line) => /^-{3,}$/.test(line.trim());
  const isQuote = (line) => /^>\s?/.test(line.trim());
  const isBullet = (line) => /^[-*]\s+/.test(line.trim());
  const isOrdered = (line) => /^\d+[.)]\s+/.test(line.trim());
  const isBlockStart = (line) =>
    !line.trim() || isHeading(line) || isRule(line) || isQuote(line) || isBullet(line) || isOrdered(line);

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isRule(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (isHeading(line)) {
      const match = trimmed.match(/^(#{1,4})\s+(.*)$/);
      blocks.push({ type: "heading", level: match[1].length, text: match[2] });
      index += 1;
      continue;
    }

    if (isQuote(line)) {
      const quoteLines = [];
      while (index < lines.length && isQuote(lines[index])) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", lines: quoteLines });
      continue;
    }

    if (isBullet(line) || isOrdered(line)) {
      const ordered = isOrdered(line);
      const items = [];
      while (index < lines.length && (ordered ? isOrdered(lines[index]) : isBullet(lines[index]))) {
        items.push(lines[index].trim().replace(ordered ? /^\d+[.)]\s+/ : /^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: ordered ? "ordered-list" : "bullet-list", items });
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length && !isBlockStart(lines[index])) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraphLines });
  }

  return (
    <div className="rich-message">
      {blocks.map((block, blockIndex) => {
        if (block.type === "rule") {
          return <hr key={blockIndex} />;
        }
        if (block.type === "heading") {
          const HeadingTag = block.level <= 2 ? "h3" : "h4";
          return <HeadingTag key={blockIndex}>{renderInline(block.text, `h-${blockIndex}`)}</HeadingTag>;
        }
        if (block.type === "quote") {
          return (
            <blockquote key={blockIndex}>
              {block.lines.map((quoteLine, lineIndex) => (
                <span key={lineIndex}>
                  {renderInline(quoteLine, `q-${blockIndex}-${lineIndex}`)}
                  {lineIndex < block.lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </blockquote>
          );
        }
        if (block.type === "bullet-list" || block.type === "ordered-list") {
          const ListTag = block.type === "ordered-list" ? "ol" : "ul";
          return (
            <ListTag key={blockIndex}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `li-${blockIndex}-${itemIndex}`)}</li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={blockIndex}>
            {block.lines.map((paragraphLine, lineIndex) => (
              <span key={lineIndex}>
                {renderInline(paragraphLine, `p-${blockIndex}-${lineIndex}`)}
                {lineIndex < block.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function reportSectionMeta(title) {
  const lowered = String(title || "").toLowerCase();
  if (lowered.includes("band") || lowered.includes("overall")) {
    return { label: "Score", tone: "score" };
  }
  if (lowered.includes("skill")) {
    return { label: "Skills", tone: "skills" };
  }
  if (lowered.includes("problem") || lowered.includes("weakness")) {
    return { label: "Issues", tone: "issues" };
  }
  if (lowered.includes("correct")) {
    return { label: "Examples", tone: "examples" };
  }
  if (lowered.includes("task") || lowered.includes("focus")) {
    return { label: "Next", tone: "tasks" };
  }
  if (lowered.includes("summary")) {
    return { label: "Summary", tone: "summary" };
  }
  return { label: "Report", tone: "default" };
}

function splitReportSections(report) {
  const text = String(report || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  const sections = [];
  const headingRegex = /^##\s+(.+)$/gm;
  const matches = [...text.matchAll(headingRegex)];

  if (!matches.length) {
    return [{ title: "Report", body: text, ...reportSectionMeta("Report") }];
  }

  const intro = text.slice(0, matches[0].index).trim();
  if (intro) {
    sections.push({ title: "Report note", body: intro, ...reportSectionMeta("Report note") });
  }

  matches.forEach((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    const title = match[1].trim();
    const body = text.slice(start, end).trim();
    if (body) {
      sections.push({ title, body, ...reportSectionMeta(title) });
    }
  });

  return sections;
}

function reportSectionId(title, index) {
  const slug = String(title || "section")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return `report-section-${index}-${slug || "section"}`;
}

export function ReportView({ report }) {
  const sections = splitReportSections(report);
  if (!sections.length) return null;
  return (
    <div className="report-sections">
      {sections.length > 1 ? (
        <nav className="report-nav" aria-label="Report sections">
          {sections.map((section, index) => (
            <button
              type="button"
              key={`${section.title}-nav-${index}`}
              onClick={() =>
                document.getElementById(reportSectionId(section.title, index))?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              {section.label}
            </button>
          ))}
        </nav>
      ) : null}
      {sections.map((section, index) => {
        const sectionId = reportSectionId(section.title, index);
        return (
          <section className={`report-section ${section.tone}`} id={sectionId} key={`${section.title}-${index}`}>
            <div className="report-section-header">
              <span className="report-section-chip">{section.label}</span>
              <h3>{section.title}</h3>
            </div>
            <RichMessage content={section.body} />
          </section>
        );
      })}
    </div>
  );
}

export function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <article
      className={`message-row ${isUser ? "user" : "assistant"}`}
      data-testid={isUser ? "message-user" : "message-assistant"}
      data-phase={message.phase || ""}
    >
      <div className="avatar" aria-hidden="true">
        {isUser ? "Y" : "V"}
      </div>
      <div className="bubble">
        <RichMessage content={message.content} />
      </div>
    </article>
  );
}
