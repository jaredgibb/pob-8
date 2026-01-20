export default function Flashcard({ term, is_revealed, on_toggle }) {
  if (!term) {
    return null;
  }

  return (
    <div className="flashcard" onClick={on_toggle} role="button" tabIndex={0}>
      <div className="flashcard__label">{is_revealed ? "Definition" : "Term"}</div>
      <div className="flashcard__content">
        {is_revealed ? term.definition : term.term}
      </div>
      <div className="flashcard__hint">Tap to {is_revealed ? "hide" : "reveal"}</div>
    </div>
  );
}
