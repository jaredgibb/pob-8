import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, ref } from "firebase/database";
import { db } from "../firebase/firebase_client.js";
import ChapterCard from "../components/ChapterCard.jsx";

export default function Chapters() {
  const [chapters, set_chapters] = useState([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error_message, set_error_message] = useState("");
  const [selected_chapters, set_selected_chapters] = useState(new Set());
  const navigate = useNavigate();

  const selected_list = useMemo(
    () => Array.from(selected_chapters).sort((a, b) => a - b),
    [selected_chapters]
  );

  useEffect(() => {
    const fetch_chapters = async () => {
      try {
        const snapshot = await get(ref(db, "chapters"));
        if (!snapshot.exists()) {
          set_chapters([]);
          return;
        }
        const data = snapshot.val();
        const list = Object.values(data || {}).map((chapter) => ({
          ...chapter,
        }));
        list.sort((a, b) => a.chapter - b.chapter);
        set_chapters(list);
      } catch (error) {
        set_error_message(error.message || "Unable to load chapters.");
      } finally {
        set_is_loading(false);
      }
    };

    fetch_chapters();
  }, []);

  const toggle_selected = (chapter_number) => {
    set_selected_chapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapter_number)) {
        next.delete(chapter_number);
      } else {
        next.add(chapter_number);
      }
      return next;
    });
  };

  const start_selected = () => {
    if (selected_list.length === 0) {
      return;
    }
    navigate(`/study?chapters=${selected_list.join(",")}`);
  };

  return (
    <section className="stack">
      <div>
        <h2>Choose a chapter</h2>
        <p className="muted">
          Start a flashcard round or review your analytics for each chapter.
        </p>
      </div>
      <div className="panel">
        <div className="button-row">
          <button
            className="button"
            type="button"
            disabled={selected_list.length === 0}
            onClick={start_selected}
          >
            Start selected ({selected_list.length})
          </button>
          <span className="muted">
            Select more than one chapter to combine decks.
          </span>
        </div>
      </div>
      {is_loading ? (
        <div className="panel">Loading chapters...</div>
      ) : null}
      {error_message ? <div className="alert">{error_message}</div> : null}
      {!is_loading && chapters.length === 0 ? (
        <div className="panel">No chapters available yet.</div>
      ) : null}
      <div className="grid">
        {chapters.map((chapter) => (
          <ChapterCard
            key={chapter.chapter}
            chapter={chapter}
            is_selected={selected_chapters.has(chapter.chapter)}
            on_toggle_selected={() => toggle_selected(chapter.chapter)}
          />
        ))}
      </div>
    </section>
  );
}
