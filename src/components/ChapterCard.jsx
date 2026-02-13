import PropTypes from "prop-types";
import { Link } from "react-router-dom";

export default function ChapterCard({ chapter, term_count, is_selected, on_toggle_selected }) {
  return (
    <div className="card">
      <div className="card__body">
        <h3>Chapter {chapter.chapter}</h3>
        <p className="muted">{chapter.name}</p>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          {term_count} {term_count === 1 ? "term" : "terms"}
        </p>
      </div>
      <div className="card__actions">
        <Link className="button" to={`/study/${chapter.chapter}`}>
          Start round
        </Link>
        <Link className="button button--ghost" to={`/analytics/${chapter.chapter}`}>
          Analytics
        </Link>
        <label className="muted">
          <input
            type="checkbox"
            checked={is_selected}
            onChange={on_toggle_selected}
          />{" "}
          Select
        </label>
      </div>
    </div>
  );
}

ChapterCard.propTypes = {
  chapter: PropTypes.shape({
    chapter: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  term_count: PropTypes.number,
  is_selected: PropTypes.bool.isRequired,
  on_toggle_selected: PropTypes.func.isRequired,
};

ChapterCard.defaultProps = {
  term_count: 0,
};
