import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Flashcard from "../components/Flashcard.jsx";
import { shuffle_array } from "../lib/shuffle.js";

const STORAGE_KEY = "safmeds_sets";
const MAX_CARDS_PER_SET = 1000;
const MAX_IMPORT_SIZE_BYTES = 500000; // 500KB limit for imported data

const create_id = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `safmeds_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const safe_btoa = (value) => {
  return btoa(unescape(encodeURIComponent(value)));
};

const safe_atob = (value) => {
  return decodeURIComponent(escape(atob(value)));
};

const load_sets = () => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const save_sets = (sets) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch (error) {
    console.error("Failed to save sets to localStorage:", error);
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(
        "Unable to save your sets because browser storage is full or unavailable. " +
          "Your latest changes may not be saved."
      );
    }
  }
};

const validate_import_data = (data) => {
  // Validate the data structure
  if (!data?.title || !Array.isArray(data.cards)) {
    return { valid: false, error: "Invalid share payload format." };
  }

  // Filter valid cards first
  const valid_cards = data.cards.filter((card) => card.term && card.definition);

  // Check number of cards
  if (valid_cards.length > MAX_CARDS_PER_SET) {
    return {
      valid: false,
      error: `This set has too many cards (${valid_cards.length}). Maximum allowed is ${MAX_CARDS_PER_SET} cards.`,
    };
  }

  // Check total data size
  const import_set = {
    title: data.title,
    description: data.description || "",
    cards: valid_cards,
  };
  const serialized = JSON.stringify(import_set);
  const size_bytes = new TextEncoder().encode(serialized).length;

  if (size_bytes > MAX_IMPORT_SIZE_BYTES) {
    const size_kb = Math.round(size_bytes / 1024);
    const max_kb = Math.round(MAX_IMPORT_SIZE_BYTES / 1024);
    return {
      valid: false,
      error: `This set is too large (${size_kb}KB). Maximum allowed is ${max_kb}KB.`,
    };
  }

  return { valid: true, cards: valid_cards };
};

const build_share_payload = (set) =>
  safe_btoa(
    JSON.stringify({
      title: set.title,
      description: set.description,
      cards: set.cards,
    })
  );

export default function Safmeds() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sets, set_sets] = useState([]);
  const [active_id, set_active_id] = useState("");
  const [draft_title, set_draft_title] = useState("");
  const [draft_description, set_draft_description] = useState("");
  const [draft_term, set_draft_term] = useState("");
  const [draft_definition, set_draft_definition] = useState("");
  const [draft_cards, set_draft_cards] = useState([]);
  const [flashcards, set_flashcards] = useState([]);
  const [current_index, set_current_index] = useState(0);
  const [is_revealed, set_is_revealed] = useState(false);
  const [message, set_message] = useState("");
  const [error_message, set_error_message] = useState("");
  const [share_id, set_share_id] = useState("");

  useEffect(() => {
    const initial_sets = load_sets();
    set_sets(initial_sets);
    if (initial_sets.length > 0) {
      set_active_id(initial_sets[0].id);
    }
  }, []);

  useEffect(() => {
    const payload = searchParams.get("import");
    if (!payload) {
      return;
    }

    try {
      const decoded = safe_atob(payload);
      const data = JSON.parse(decoded);
      
      // Validate import data
      const validation = validate_import_data(data);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const imported_set = {
        id: create_id(),
        title: data.title,
        description: data.description || "",
        cards: validation.cards,
        created_at: Date.now(),
        imported_at: Date.now(),
      };
      set_sets((prev) => {
        const next = [imported_set, ...prev];
        save_sets(next);
        return next;
      });
      set_active_id(imported_set.id);
      set_message(`Imported "${imported_set.title}" to your Safmeds sets.`);
      set_error_message("");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("import");
        return next;
      });
    } catch (error) {
      set_error_message(error.message || "Unable to import this Safmeds set.");
    }
  }, [searchParams, setSearchParams]);

  const active_set = useMemo(
    () => sets.find((set) => set.id === active_id),
    [sets, active_id]
  );

  useEffect(() => {
    if (active_set) {
      const shuffled = shuffle_array(active_set.cards);
      set_flashcards(shuffled);
      set_current_index(0);
      set_is_revealed(false);
      set_share_id("");
    } else {
      set_flashcards([]);
    }
  }, [active_set]);

  const handle_add_card = () => {
    set_message("");
    set_error_message("");
    if (!draft_term.trim() || !draft_definition.trim()) {
      set_error_message("Add both a term and definition before saving.");
      return;
    }
    if (draft_term.trim().length > 500) {
      set_error_message("Term must be 500 characters or less.");
      return;
    }
    if (draft_definition.trim().length > 500) {
      set_error_message("Definition must be 500 characters or less.");
      return;
    }
    set_draft_cards((prev) => [
      ...prev,
      { term: draft_term.trim(), definition: draft_definition.trim() },
    ]);
    set_draft_term("");
    set_draft_definition("");
  };

  const handle_remove_draft_card = (index) => {
    set_draft_cards((prev) => prev.filter((_, i) => i !== index));
  };

  const handle_save_set = () => {
    set_message("");
    set_error_message("");
    if (!draft_title.trim()) {
      set_error_message("Please name your Safmeds set.");
      return;
    }
    if (draft_cards.length === 0) {
      set_error_message("Add at least one card to save your set.");
      return;
    }
    const new_set = {
      id: create_id(),
      title: draft_title.trim(),
      description: draft_description.trim(),
      cards: draft_cards,
      created_at: Date.now(),
    };
    set_sets((prev) => {
      const next = [new_set, ...prev];
      save_sets(next);
      return next;
    });
    set_active_id(new_set.id);
    set_draft_title("");
    set_draft_description("");
    set_draft_cards([]);
    set_message(`Saved "${new_set.title}" to your Safmeds sets.`);
  };

  const handle_delete_set = (set_id) => {
    set_sets((prev) => {
      const next = prev.filter((set) => set.id !== set_id);
      save_sets(next);
      return next;
    });
    if (active_id === set_id) {
      set_active_id("");
    }
  };

  const handle_toggle = () => {
    set_is_revealed((prev) => !prev);
  };

  const handle_next = () => {
    if (current_index + 1 < flashcards.length) {
      set_current_index((prev) => prev + 1);
      set_is_revealed(false);
    } else {
      set_current_index(0);
      set_is_revealed(false);
      set_flashcards(shuffle_array(flashcards));
    }
  };

  const handle_prev = () => {
    if (current_index > 0) {
      set_current_index((prev) => prev - 1);
      set_is_revealed(false);
    }
  };

  const handle_share = (set_id) => {
    set_share_id(set_id);
  };

  const handle_copy_link = async (share_url) => {
    if (!navigator?.clipboard) {
      set_error_message("Clipboard unavailable. Please copy the link manually.");
      return;
    }
    try {
      await navigator.clipboard.writeText(share_url);
      set_message("Share link copied to clipboard.");
      set_error_message("");
    } catch {
      set_error_message("Unable to copy link. Please copy it manually.");
    }
  };

  const share_set = sets.find((set) => set.id === share_id);
  const share_link = useMemo(() => {
    if (!share_set || typeof window === "undefined") {
      return "";
    }
    const payload = encodeURIComponent(build_share_payload(share_set));
    return `${window.location.origin}/safmeds?import=${payload}`;
  }, [share_set]);

  const current_card = flashcards[current_index];

  return (
    <section className="stack">
      <div>
        <h2>Safmeds</h2>
        <p className="muted">
          Create and share personal flashcard sets without touching the main
          PoB Firebase deck.
        </p>
      </div>

      {message ? <div className="notice">{message}</div> : null}
      {error_message ? <div className="alert">{error_message}</div> : null}

      <div className="safmeds-layout">
        <div className="panel stack">
          <h3>Create a set</h3>
          <label className="form__field">
            Set name
            <input
              value={draft_title}
              onChange={(event) => set_draft_title(event.target.value)}
              placeholder="e.g. Cardiac meds"
            />
          </label>
          <label className="form__field">
            Description (optional)
            <textarea
              rows="3"
              value={draft_description}
              onChange={(event) => set_draft_description(event.target.value)}
              placeholder="What does this set cover?"
            />
          </label>
          <div className="safmeds-card-builder">
            <label className="form__field">
              Term
              <input
                value={draft_term}
                onChange={(event) => set_draft_term(event.target.value)}
                placeholder="Metoprolol"
              />
            </label>
            <label className="form__field">
              Definition
              <input
                value={draft_definition}
                onChange={(event) => set_draft_definition(event.target.value)}
                placeholder="Beta blocker"
              />
            </label>
            <button className="button button--ghost" onClick={handle_add_card} type="button">
              Add card
            </button>
          </div>
          {draft_cards.length > 0 ? (
            <div className="safmeds-card-list">
              {draft_cards.map((card, index) => (
                <div className="safmeds-card-row" key={`${card.term}-${index}`}>
                  <div>
                    <strong>{card.term}</strong>
                    <div className="muted">{card.definition}</div>
                  </div>
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => handle_remove_draft_card(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Add terms to build your set.</p>
          )}
          <button className="button" onClick={handle_save_set} type="button">
            Save Safmeds set
          </button>
        </div>

        <div className="panel stack">
          <h3>Your sets</h3>
          {sets.length === 0 ? (
            <p className="muted">No Safmeds sets yet. Create one to begin.</p>
          ) : (
            <div className="safmeds-set-list">
              {sets.map((set) => (
                <div
                  className={`safmeds-set-card${set.id === active_id ? " is-active" : ""}`}
                  key={set.id}
                >
                  <div>
                    <h4>{set.title}</h4>
                    <p className="muted">{set.cards.length} cards</p>
                  </div>
                  <div className="button-row">
                    <button
                      className="button button--ghost"
                      onClick={() => set_active_id(set.id)}
                      type="button"
                    >
                      Open
                    </button>
                    <button
                      className="button button--ghost"
                      onClick={() => handle_share(set.id)}
                      type="button"
                    >
                      Share
                    </button>
                    <button
                      className="button"
                      onClick={() => handle_delete_set(set.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {active_set ? (
        <div className="panel stack">
          <div className="safmeds-detail-header">
            <div>
              <h3>{active_set.title}</h3>
              <p className="muted">{active_set.description || "No description added."}</p>
            </div>
            <span className="muted">
              {active_set.cards.length} cards ·{" "}
              {new Date(active_set.created_at).toLocaleDateString()}
            </span>
          </div>

          {flashcards.length > 0 ? (
            <div className="stack">
              <div className="subtle-row">
                <span>
                  Card {current_index + 1} / {flashcards.length}
                </span>
                <span className="muted">Tap to flip</span>
              </div>
              <Flashcard term={current_card} is_revealed={is_revealed} on_toggle={handle_toggle} />
              <div className="button-row">
                <button
                  className="button button--ghost"
                  onClick={handle_prev}
                  type="button"
                  disabled={current_index === 0}
                >
                  Previous
                </button>
                <button className="button" onClick={handle_next} type="button">
                  Next
                </button>
              </div>
            </div>
          ) : (
            <p className="muted">No cards available in this set.</p>
          )}

          {share_set ? (
            <div className="safmeds-share panel">
              <h4>Share this set</h4>
              <p className="muted">
                Anyone with this link can import your Safmeds deck into their own account.
              </p>
              <div className="safmeds-share__link">
                <input readOnly value={share_link} />
                <button
                  className="button button--ghost"
                  onClick={() => handle_copy_link(share_link)}
                  type="button"
                >
                  Copy link
                </button>
              </div>
              {share_link ? (
                <div className="safmeds-share__qr">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      share_link
                    )}`}
                    alt={`QR code for ${share_set.title}`}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="panel">
          <p className="muted">
            Select a Safmeds set to review or share it with your classmates.
          </p>
        </div>
      )}
    </section>
  );
}
