import PropTypes from "prop-types";

export default function Flashcard({ term, is_revealed, on_toggle }) {
  if (!term) {
    return null;
  }

  const handle_key_down = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      on_toggle();
    }
  };

  return (
    <div
      className="flashcard"
      onClick={on_toggle}
      onKeyDown={handle_key_down}
      role="button"
      tabIndex={0}
      aria-label={is_revealed ? `Definition: ${term.definition}. Tap to show term.` : `Term: ${term.term}. Tap to reveal definition.`}
      aria-pressed={is_revealed}
    >
      <div className="flashcard__label" aria-hidden="true">
        {is_revealed ? "Definition" : "Term"}
      </div>
      <div className="flashcard__content">
        {is_revealed ? term.definition : term.term}
      </div>
      <div className="flashcard__hint" aria-hidden="true">
        Tap or press Space to {is_revealed ? "hide" : "reveal"}
      </div>
    </div>
  );
}

Flashcard.propTypes = {
  term: PropTypes.shape({
    term: PropTypes.string.isRequired,
    definition: PropTypes.string.isRequired,
  }),
  is_revealed: PropTypes.bool.isRequired,
  on_toggle: PropTypes.func.isRequired,
};
