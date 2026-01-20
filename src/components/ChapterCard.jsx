import { Link } from "react-router-dom";

export default function ChapterCard({ chapter }) {
  return (
    <div className="card">
      <div className="card__body">
        <h3>Chapter {chapter.chapter}</h3>
        <p className="muted">{chapter.name}</p>
      </div>
      <div className="card__actions">
        <Link className="button" to={`/study/${chapter.chapter}`}>
          Start round
        </Link>
        <Link className="button button--ghost" to={`/analytics/${chapter.chapter}`}>
          Analytics
        </Link>
      </div>
    </div>
  );
}
