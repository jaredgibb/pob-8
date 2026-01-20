import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { equalTo, get, orderByChild, query, ref, set } from "firebase/database";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase/firebase_client.js";
import { use_auth } from "../auth/AuthProvider.jsx";
import Flashcard from "../components/Flashcard.jsx";
import { shuffle_array } from "../lib/shuffle.js";
import { format_date_ymd } from "../lib/date.js";
import { format_duration_ms } from "../lib/time.js";

export default function Study() {
  const { chapter_number } = useParams();
  const chapter_value = Number(chapter_number);
  const navigate = useNavigate();
  const { user } = use_auth();
  const [terms, set_terms] = useState([]);
  const [current_index, set_current_index] = useState(0);
  const [is_revealed, set_is_revealed] = useState(false);
  const [correct_count, set_correct_count] = useState(0);
  const [incorrect_count, set_incorrect_count] = useState(0);
  const [is_loading, set_is_loading] = useState(true);
  const [error_message, set_error_message] = useState("");
  const [is_complete, set_is_complete] = useState(false);
  const [elapsed_ms, set_elapsed_ms] = useState(0);
  const [is_saving, set_is_saving] = useState(false);
  const [is_timing, set_is_timing] = useState(false);

  const start_time_ref = useRef(null);
  const interval_ref = useRef(null);

  const total_count = correct_count + incorrect_count;
  const accuracy = total_count ? correct_count / total_count : 0;

  const load_terms = useCallback(async () => {
    set_is_loading(true);
    set_error_message("");
    set_current_index(0);
    set_is_revealed(false);
    set_correct_count(0);
    set_incorrect_count(0);
    set_is_complete(false);
    set_elapsed_ms(0);
    set_is_timing(false);
    start_time_ref.current = null;
    try {
      const terms_query = query(
        ref(db, "terms"),
        orderByChild("chapter"),
        equalTo(chapter_value)
      );
      const snapshot = await get(terms_query);
      if (!snapshot.exists()) {
        set_terms([]);
        return;
      }
      const data = snapshot.val();
      const list = Object.values(data || {});
      set_terms(shuffle_array(list));
    } catch (error) {
      set_error_message(error.message || "Unable to load terms.");
    } finally {
      set_is_loading(false);
    }
  }, [chapter_value]);

  useEffect(() => {
    load_terms();
  }, [load_terms]);

  useEffect(() => {
    if (terms.length > 0 && !is_complete && start_time_ref.current === null) {
      start_time_ref.current = Date.now();
      set_is_timing(true);
    }
  }, [terms, is_complete]);

  useEffect(() => {
    if (is_timing && start_time_ref.current !== null) {
      interval_ref.current = setInterval(() => {
        set_elapsed_ms(Date.now() - start_time_ref.current);
      }, 1000);
    }

    return () => {
      if (interval_ref.current) {
        clearInterval(interval_ref.current);
      }
    };
  }, [is_timing]);

  const handle_toggle = () => {
    set_is_revealed((prev) => !prev);
  };

  const handle_score = (is_correct) => {
    if (is_correct) {
      set_correct_count((prev) => prev + 1);
    } else {
      set_incorrect_count((prev) => prev + 1);
    }

    set_is_revealed(false);

    if (current_index + 1 >= terms.length) {
      set_is_complete(true);
      set_is_timing(false);
      if (interval_ref.current) {
        clearInterval(interval_ref.current);
      }
      if (start_time_ref.current) {
        set_elapsed_ms(Date.now() - start_time_ref.current);
      }
      return;
    }

    set_current_index((prev) => prev + 1);
  };

  const reset_round = () => {
    set_terms((prev) => shuffle_array(prev));
    set_current_index(0);
    set_is_revealed(false);
    set_correct_count(0);
    set_incorrect_count(0);
    set_is_complete(false);
    set_elapsed_ms(0);
    set_is_timing(false);
    start_time_ref.current = null;
  };

  const handle_save = async () => {
    if (!user) {
      return;
    }

    set_is_saving(true);
    try {
      const now_seconds = Date.now() / 1000;
      const timestamp_key = String(Math.floor(now_seconds));
      const total = correct_count + incorrect_count;
      const accuracy_value = total ? correct_count / total : 0;
      const date_string = format_date_ymd(new Date());
      const record = {
        chapter: chapter_value,
        correct: correct_count,
        incorrect: incorrect_count,
        date: now_seconds,
        C_DateScore: `(${date_string},${correct_count})`,
        I_DateScore: `(${date_string},${incorrect_count})`,
        __scopeVariableInfo: {
          scope: "APP",
          variableName: "currentUsersFlashRound",
        },
        duration_ms: elapsed_ms,
        total,
        accuracy: accuracy_value,
      };

      await set(
        ref(db, `users/${user.uid}/scores/${chapter_value}/${timestamp_key}`),
        record
      );
      navigate("/chapters", { replace: true });
    } catch (error) {
      set_error_message(error.message || "Unable to save score.");
    } finally {
      set_is_saving(false);
    }
  };

  const current_term = terms[current_index];
  const formatted_time = useMemo(
    () => format_duration_ms(elapsed_ms),
    [elapsed_ms]
  );

  return (
    <section className="stack">
      <div className="panel">
        <h2>Chapter {chapter_value}</h2>
        <div className="subtle-row">
          <span>Card {Math.min(current_index + 1, terms.length)} / {terms.length}</span>
          <span>Elapsed: {formatted_time}</span>
        </div>
      </div>

      {is_loading ? <div className="panel">Loading terms...</div> : null}
      {error_message ? <div className="alert">{error_message}</div> : null}

      {!is_loading && terms.length === 0 ? (
        <div className="panel">
          <p>No terms found for this chapter.</p>
          <button className="button" onClick={() => navigate("/chapters")}
            type="button">
            Return to chapters
          </button>
        </div>
      ) : null}

      {!is_loading && terms.length > 0 && !is_complete ? (
        <div className="stack">
          <Flashcard term={current_term} is_revealed={is_revealed} on_toggle={handle_toggle} />
          <div className="button-row">
            <button className="button" onClick={() => handle_score(true)} type="button">
              Correct
            </button>
            <button
              className="button button--ghost"
              onClick={() => handle_score(false)}
              type="button"
            >
              Incorrect
            </button>
          </div>
        </div>
      ) : null}

      {is_complete ? (
        <div className="panel stack">
          <h3>Round complete</h3>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat__label">Correct</span>
              <span className="stat__value">{correct_count}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Incorrect</span>
              <span className="stat__value">{incorrect_count}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Accuracy</span>
              <span className="stat__value">{Math.round(accuracy * 100)}%</span>
            </div>
            <div className="stat">
              <span className="stat__label">Duration</span>
              <span className="stat__value">{format_duration_ms(elapsed_ms)}</span>
            </div>
          </div>
          <div className="button-row">
            <button className="button" onClick={handle_save} disabled={is_saving}
              type="button">
              {is_saving ? "Saving..." : "Save & return to chapters"}
            </button>
            <button className="button button--ghost" onClick={reset_round}
              type="button">
              Retry this chapter
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
