import { useEffect, useMemo, useState } from "react";
import { get, limitToLast, query, ref } from "firebase/database";
import { Link, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../firebase/firebase_client.js";
import { DB_PATHS, MAX_AG_HISTORY } from "../lib/constants.js";
import { use_auth } from "../auth/AuthProvider.jsx";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import Skeleton from "../components/Skeleton.jsx";
import { format_full_date, format_time_label } from "../lib/date.js";
import { format_duration_ms, parse_duration_ms } from "../lib/time.js";

function normalize_scores(scores_snapshot) {
  if (!scores_snapshot) {
    return [];
  }

  const entries = Array.isArray(scores_snapshot)
    ? scores_snapshot
        .map((record, index) => ({
          key: String(index),
          record,
        }))
        .filter((item) => item.record)
    : Object.entries(scores_snapshot).map(([key, record]) => ({ key, record }));

  return entries
    .map(({ key, record }) => {
      const date_value = Number(record.date) || Number(key) || 0;
      const total = Number(record.total) || Number(record.correct || 0) + Number(record.incorrect || 0);
      const accuracy =
        Number.isFinite(record.accuracy) && record.accuracy !== null
          ? Number(record.accuracy)
          : total
            ? Number(record.correct || 0) / total
            : 0;
      return {
        key,
        date: date_value,
        correct: Number(record.correct || 0),
        incorrect: Number(record.incorrect || 0),
        total,
        accuracy,
        duration_ms: parse_duration_ms(Number(record.duration_ms)),
      };
    })
    .sort((a, b) => a.date - b.date);
}

function get_best_time(records) {
  const durations = records
    .map((record) => record.duration_ms)
    .filter((value) => Number.isFinite(value));
  if (!durations.length) {
    return null;
  }
  return Math.min(...durations);
}

export default function Analytics() {
  const { chapter_number } = useParams();
  const chapter_value = Number(chapter_number);
  const { user } = use_auth();
  const [scores, set_scores] = useState([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error_message, set_error_message] = useState("");
  const [range_filter, set_range_filter] = useState("all");

  useDocumentTitle(`Analytics - Chapter ${chapter_value}`);

  const fetch_scores = async () => {
    if (!user) {
      return;
    }
    set_is_loading(true);
    set_error_message("");
    try {
      const db_ref = ref(db, `${DB_PATHS.USERS}/${user.uid}/${DB_PATHS.SCORES}/${chapter_value}`);
      const recent_query = query(db_ref, limitToLast(MAX_AG_HISTORY));
      const snapshot = await get(recent_query);
      const data = snapshot.exists() ? snapshot.val() : null;
      set_scores(normalize_scores(data));
    } catch (error) {
      set_error_message(error.message || "Unable to load analytics.");
    } finally {
      set_is_loading(false);
    }
  };

  useEffect(() => {
    fetch_scores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter_value, user?.uid]);

  const filtered_scores = useMemo(() => {
    if (range_filter === "all") {
      return scores;
    }
    const days = Number(range_filter);
    const cutoff = Date.now() / 1000 - days * 24 * 60 * 60;
    return scores.filter((record) => record.date >= cutoff);
  }, [range_filter, scores]);

  const last_round = filtered_scores[filtered_scores.length - 1];
  const best_accuracy = filtered_scores.reduce(
    (best, record) => (record.accuracy > best ? record.accuracy : best),
    0
  );
  const best_time = get_best_time(filtered_scores);
  const rolling_average = (() => {
    if (!filtered_scores.length) {
      return 0;
    }
    const recent = filtered_scores.slice(-5);
    const total = recent.reduce((sum, record) => sum + record.accuracy, 0);
    return total / recent.length;
  })();

  const chart_data = filtered_scores.map((record) => ({
    ...record,
    date_label: format_time_label(record.date),
    accuracy_percent: Math.round(record.accuracy * 100),
    duration_seconds: record.duration_ms ? Math.round(record.duration_ms / 1000) : null,
  }));

  return (
    <section className="stack">
      <div>
        <Link to="/chapters" className="muted" style={{ fontSize: "0.85rem" }}>
          ← Back to chapters
        </Link>
        <h2>Chapter {chapter_value} analytics</h2>
        <p className="muted">Track your accuracy and speed over time.</p>
      </div>

      <div className="panel filter-row">
        <span>Range</span>
        <div className="button-row">
          {[
            { label: "All", value: "all" },
            { label: "30 days", value: "30" },
            { label: "7 days", value: "7" },
          ].map((option) => (
            <button
              key={option.value}
              className={`button button--ghost ${range_filter === option.value ? "is-active" : ""}`}
              onClick={() => set_range_filter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {is_loading ? (
        <div className="stats-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="" style={{ height: "80px", borderRadius: "1rem" }} />
          ))}
        </div>
      ) : null}

      {error_message ? (
        <div className="alert stack">
          <p>{error_message}</p>
          <button className="button button--ghost" onClick={fetch_scores} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {!is_loading && filtered_scores.length === 0 ? (
        <div className="panel">No rounds saved yet for this chapter.</div>
      ) : null}

      {filtered_scores.length > 0 ? (
        <div className="stats-grid">
          <div className="stat">
            <span className="stat__label">Last round accuracy</span>
            <span className="stat__value">{Math.round((last_round?.accuracy || 0) * 100)}%</span>
            <span className="muted">{format_full_date(last_round?.date)}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Last round duration</span>
            <span className="stat__value">
              {last_round?.duration_ms ? format_duration_ms(last_round.duration_ms) : "—"}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">Best accuracy</span>
            <span className="stat__value">{Math.round(best_accuracy * 100)}%</span>
          </div>
          <div className="stat">
            <span className="stat__label">Best time</span>
            <span className="stat__value">{best_time ? format_duration_ms(best_time) : "—"}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Rolling avg (last 5)</span>
            <span className="stat__value">{Math.round(rolling_average * 100)}%</span>
          </div>
        </div>
      ) : null}

      {filtered_scores.length > 0 ? (
        <div className="chart-grid">
          <div className="panel">
            <h3>Accuracy % over time</h3>
            <div className="chart">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chart_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date_label" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="accuracy_percent" name="Accuracy %" stroke="#4f46e5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <h3>Correct vs incorrect</h3>
            <div className="chart">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chart_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date_label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="correct" name="Correct" fill="#22c55e" />
                  <Bar dataKey="incorrect" name="Incorrect" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <h3>Duration (seconds) over time</h3>
            <div className="chart">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chart_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date_label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="duration_seconds" name="Duration (s)" stroke="#0ea5e9" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
