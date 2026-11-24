import { useMemo } from "react";
import { PRACTICE_TYPES, TRAINING_MODES } from "../../config/appConfig.js";
import { greeting, partLabel } from "../../utils/sessionView.js";
import { Icon } from "../ui.jsx";

const CHIP_COUNT = 5;

function pickChips(items, selected) {
  const list = items.slice(0, CHIP_COUNT);
  if (selected && !list.includes(selected)) list[list.length - 1] = selected;
  return list;
}

export function HomeScreen({
  state,
  memo,
  resume,
  onChange,
  onStart,
  onResume,
  onOpenSettings,
}) {
  const { trainingMode, practiceType, part1Topic, cueCardTitle, practiceOptions } = state;
  const topics = practiceOptions.part1_topics || [];
  const cards = useMemo(() => (practiceOptions.cue_cards || []).map((card) => card.title), [practiceOptions.cue_cards]);
  const usesTopic = practiceType === "part1";
  const usesCard = practiceType === "part2" || practiceType === "part3";
  const pool = usesTopic ? topics : usesCard ? cards : [];
  const selected = usesTopic ? part1Topic : cueCardTitle;
  const chips = pickChips(pool, selected);
  const setSelected = (value) => onChange(usesTopic ? { part1Topic: value } : { cueCardTitle: value });
  const bankLabel = practiceOptions.question_bank_label || "Question bank";

  return (
    <main className="screen paper home" data-testid="home-screen">
      <header className="bar">
        <span className="brand">Examiner Victoria</span>
        <button className="icon-btn" type="button" onClick={onOpenSettings} aria-label="Settings" data-testid="open-settings">
          <Icon name="settings" />
        </button>
      </header>

      <div className="home-scroll">
        <p className="kicker">{greeting()}</p>
        <h1 className="serif home-title">What shall we practise today?</h1>
        {memo?.text ? (
          <aside className="memo" data-testid="memo">
            <b>From last time:</b> {memo.text}
          </aside>
        ) : null}

        {resume ? (
          <button className="resume-card" type="button" onClick={onResume} data-testid="resume-session">
            <span>
              <b>Carry on where you stopped</b>
              <small>{partLabel(resume.session?.phase)} · {resume.trainingMode === "mock" ? "Mock" : "Practice"}</small>
            </span>
            <Icon name="chevron" />
          </button>
        ) : null}

        <section className="bank-card" aria-label="Question bank">
          <span className="bank-dot" aria-hidden="true" />
          <span>
            <b>{bankLabel}</b>
            <small>
              {topics.length ? `${topics.length} Part 1 topics` : "Part 1 topics"} · {cards.length ? `${cards.length} cue cards` : "cue cards"}
            </small>
          </span>
        </section>

        <div className="segmented" role="radiogroup" aria-label="Mode">
          {TRAINING_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={trainingMode === mode.value}
              className={trainingMode === mode.value ? "is-on" : ""}
              onClick={() => onChange({ trainingMode: mode.value })}
              data-testid={`mode-${mode.value}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <p className="hint">{TRAINING_MODES.find((mode) => mode.value === trainingMode)?.hint}</p>

        <div className="part-list" role="radiogroup" aria-label="What to practise">
          {PRACTICE_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={practiceType === type.value}
              className={`part-row${practiceType === type.value ? " is-on" : ""}`}
              onClick={() => onChange({ practiceType: type.value })}
              data-testid={`part-${type.value}`}
            >
              <span className="part-tag">{type.value === "full" ? "All" : type.label}</span>
              <span className="part-copy">
                <b>{type.title}</b>
                <small>{type.meta}</small>
              </span>
              <span className="part-min">{type.minutes}</span>
            </button>
          ))}
        </div>

        {pool.length ? (
          <section className="topics" aria-label={usesTopic ? "Topic" : "Cue card"}>
            <p className="kicker">{usesTopic ? "Topic" : "Cue card"}</p>
            <div className="chip-row">
              <button type="button" className={`topic-chip${!selected ? " is-on" : ""}`} onClick={() => setSelected("")}>
                Any
              </button>
              {chips.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`topic-chip${selected === item ? " is-on" : ""}`}
                  onClick={() => setSelected(item)}
                >
                  {item}
                </button>
              ))}
              <label className="topic-more">
                <span className="sr-only">All {usesTopic ? "topics" : "cue cards"}</span>
                <select value="" onChange={(event) => {
                  const value = event.target.value;
                  if (value) setSelected(value);
                }} data-testid="topic-select">
                  <option value="">More…</option>
                  {pool.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        ) : null}

      </div>

      <footer className="cta">
        <button className="btn main" type="button" onClick={onStart} data-testid="start-button">
          <span className="ember-dot" aria-hidden="true"><Icon name="mic" size={12} strokeWidth={2.6} /></span>
          Start
        </button>
      </footer>
    </main>
  );
}
