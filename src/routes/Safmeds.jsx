import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { get, ref, set } from "firebase/database";
import { db } from "../firebase/firebase_client.js";
import { DB_PATHS } from "../lib/constants.js";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";
import Flashcard from "../components/Flashcard.jsx";
import Skeleton from "../components/Skeleton.jsx";
import { shuffle_array } from "../lib/shuffle.js";

const STORAGE_KEY = "safmeds_sets";
const MAX_CARDS_PER_SET = 1000;

const create_id = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `safmeds_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

export default function Safmeds() {
  useDocumentTitle("Safmeds");
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
  const [is_sharing, set_is_sharing] = useState(false);
  const [is_importing, set_is_importing] = useState(false);

  useEffect(() => {
    const initial_sets = load_sets();
    set_sets(initial_sets);
    if (initial_sets.length > 0) {
      set_active_id(initial_sets[0].id);
    }
  }, []);

  useEffect(() => {
    const import_id = searchParams.get("share_id");
    if (!import_id) {
      return;
    }

    const fetch_shared_set = async () => {
      set_is_importing(true);
      set_error_message("");
      try {
        const snapshot = await get(ref(db, `${DB_PATHS.SHARED_SAFMEDS}/${import_id}`));
        if (!snapshot.exists()) {
          throw new Error("This shared set does not exist or has been deleted.");
        }
        
        const data = snapshot.val();
        
        // Check if we already have this imported (optional, but good UX)
        // For now, we always import as a new copy to avoid conflicts

        const imported_set = {
          id: create_id(),
          title: data.title,
          description: data.description || "",
          cards: data.cards || [],
          created_at: Date.now(),
          imported_at: Date.now(),
          original_share_id: import_id
        };

        if (!Array.isArray(imported_set.cards) || imported_set.cards.length === 0) {
           throw new Error("The shared set appears to be empty.");
        }

        set_sets((prev) => {
          const next = [imported_set, ...prev];
          save_sets(next);
          return next;
        });
        set_active_id(imported_set.id);
        set_message(`Imported "${imported_set.title}" to your Safmeds sets.`);
        
        // Clean URL
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("share_id");
          return next;
        });
      } catch (error) {
        set_error_message(error.message || "Unable to import this Safmeds set.");
      } finally {
        set_is_importing(false);
      }
    };

    fetch_shared_set();
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

  useEffect(() => {
    const handle_keydown = (event) => {
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
        return;
      }

      if (active_set && flashcards.length > 0) {
        switch (event.key) {
          case " ":
          case "Enter":
            event.preventDefault();
            handle_toggle();
            break;
          case "ArrowRight":
            event.preventDefault();
            handle_next();
            break;
          case "ArrowLeft":
            event.preventDefault();
            handle_prev();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handle_keydown);
    return () => window.removeEventListener("keydown", handle_keydown);
  }, [active_set, flashcards.length, is_revealed, current_index]);

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

  const create_share_link = async (set_to_share) => {
    if (is_sharing) return;
    set_is_sharing(true);
    set_message("");
    set_error_message("");
    
    try {
      // Create a short ID for sharing (simpler than UUID for URL friendliness, but unique enough)
      // For global uniqueness without collision checks, UUID or long random string is safest. 
      // We'll use a 12-char alphanumeric string.
      const share_key = Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 8);
      
      const payload = {
        title: set_to_share.title,
        description: set_to_share.description || "",
        cards: set_to_share.cards,
        created_at: Date.now(),
        // We could add author info if we had it, but SAFMEDS is currently anonymous/local
      };

      await set(ref(db, `${DB_PATHS.SHARED_SAFMEDS}/${share_key}`), payload);
      set_share_id(share_key);
    } catch (error) {
      set_error_message("Failed to create share link. Please try again.");
      console.error(error);
    } finally {
      set_is_sharing(false);
    }
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

  const share_link = useMemo(() => {
    if (!share_id || typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/safmeds?share_id=${share_id}`;
  }, [share_id]);

  const current_card = flashcards[current_index];

  if (is_importing) {
    return (
      <section className="stack">
        <div className="panel">
          <Skeleton style={{ height: "40px", marginBottom: "1rem" }} />
          <Skeleton style={{ height: "20px", marginBottom: "2rem" }} />
          <p className="muted">Importing shared deck...</p>
        </div>
      </section>
    );
  }

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
                      onClick={() => create_share_link(set)}
                      type="button"
                      disabled={is_sharing}
                    >
                      {is_sharing && share_id === "" ? "Creating..." : "Share"}
                    </button>
                    <button
                      className="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this set? This action cannot be undone.")) {
                          handle_delete_set(set.id);
                        }
                      }}
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
                  aria-label="Previous flashcard"
                  title="Previous (←)"
                >
                  Previous
                </button>
                <button
                  className="button"
                  onClick={handle_next}
                  type="button"
                  aria-label="Next flashcard"
                  title="Next (→)"
                >
                  Next
                </button>
              </div>
              <p className="keyboard-hint muted" style={{ marginTop: "1rem" }}>
                Keyboard: <kbd>Space</kbd> toggle · <kbd>←</kbd> previous · <kbd>→</kbd> next
              </p>
            </div>
          ) : (
            <p className="muted">No cards available in this set.</p>
          )}

          {share_id && !is_sharing ? (
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
                    alt={`QR code for ${active_set.title}`}
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
