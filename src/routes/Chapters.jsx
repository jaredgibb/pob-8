import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, ref } from "firebase/database";
import { db } from "../firebase/firebase_client.js";
import { DB_PATHS } from "../lib/constants.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import ChapterCard from "../components/ChapterCard.jsx";
import Skeleton from "../components/Skeleton.jsx";

export default function Chapters() {
  useDocumentTitle("Chapters");
  const [chapters, set_chapters] = useState([]);
  const [term_counts, set_term_counts] = useState({});
  const [is_loading, set_is_loading] = useState(true);
  const [error_message, set_error_message] = useState("");
  const [selected_chapters, set_selected_chapters] = useState(new Set());
  const navigate = useNavigate();

  const selected_list = useMemo(
    () => Array.from(selected_chapters).sort((a, b) => a - b),
    [selected_chapters]
  );

  const fetch_chapters = async () => {
    set_is_loading(true);
    set_error_message("");
    try {
      const [chapters_snapshot, terms_snapshot] = await Promise.all([
        get(ref(db, DB_PATHS.CHAPTERS)),
        get(ref(db, DB_PATHS.TERMS)),
      ]);
      
      if (!chapters_snapshot.exists()) {
        set_chapters([]);
        return;
      }
      
      const chapters_data = chapters_snapshot.val();
      const list = Object.values(chapters_data || {}).map((chapter) => ({
        ...chapter,
      }));
      list.sort((a, b) => a.chapter - b.chapter);
      set_chapters(list);

      // Count terms per chapter
      if (terms_snapshot.exists()) {
        const terms_data = terms_snapshot.val();
        const counts = {};
        Object.values(terms_data || {}).forEach((term) => {
          const chapter = term.chapter;
          counts[chapter] = (counts[chapter] || 0) + 1;
        });
        set_term_counts(counts);
      }
    } catch (error) {
      set_error_message(error.message || "Unable to load chapters.");
    } finally {
      set_is_loading(false);
    }
  };

  useEffect(() => {
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
        <div className="grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="panel" style={{ height: "160px" }} />
          ))}
        </div>
      ) : null}

      {error_message ? (
        <div className="alert stack">
          <p>{error_message}</p>
          <button className="button button--ghost" onClick={fetch_chapters} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {!is_loading && !error_message && chapters.length === 0 ? (
        <div className="panel">No chapters available yet.</div>
      ) : null}

      {!is_loading && !error_message && chapters.length > 0 ? (
        <div className="grid">
          {chapters.map((chapter) => (
            <ChapterCard
              key={chapter.chapter}
              chapter={chapter}
              term_count={term_counts[chapter.chapter] || 0}
              is_selected={selected_chapters.has(chapter.chapter)}
              on_toggle_selected={() => toggle_selected(chapter.chapter)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
