import { useEffect, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase/firebase_client.js";
import ChapterCard from "../components/ChapterCard.jsx";

export default function Chapters() {
  const [chapters, set_chapters] = useState([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error_message, set_error_message] = useState("");

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

  return (
    <section className="stack">
      <div>
        <h2>Choose a chapter</h2>
        <p className="muted">
          Start a flashcard round or review your analytics for each chapter.
        </p>
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
          <ChapterCard key={chapter.chapter} chapter={chapter} />
        ))}
      </div>
    </section>
  );
}
