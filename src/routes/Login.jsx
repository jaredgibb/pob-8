import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase_client.js";
import { use_auth } from "../auth/AuthProvider.jsx";
import { useDocumentTitle } from "../lib/useDocumentTitle.js";

const get_friendly_error = (error_code) => {
  switch (error_code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";
    case "auth/user-not-found":
      return "No account found with this email. Try signing up instead.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in.";
    case "auth/weak-password":
      return "Password must be at least 6 characters long.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    default:
      return "Unable to authenticate. Please try again.";
  }
};

export default function Login() {
  const navigate = useNavigate();
  const { user } = use_auth();
  const [email, set_email] = useState("");
  const [password, set_password] = useState("");
  const [error_message, set_error_message] = useState("");
  const [is_submitting, set_is_submitting] = useState(false);

  useDocumentTitle("Sign In");

  useEffect(() => {
    if (user) {
      navigate("/chapters", { replace: true });
    }
  }, [navigate, user]);

  const handle_submit = async (event, mode) => {
    event.preventDefault();
    set_error_message("");
    set_is_submitting(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/chapters", { replace: true });
    } catch (error) {
      set_error_message(get_friendly_error(error.code));
    } finally {
      set_is_submitting(false);
    }
  };

  return (
    <div className="panel auth-panel">
      <h2>Welcome back</h2>
      <p className="muted">Sign in or create an account to track your progress.</p>
      <form className="form" onSubmit={(event) => handle_submit(event, "login")}
        >
        <label className="form__field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => set_email(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="form__field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => set_password(event.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
        </label>
        {error_message ? <div className="alert">{error_message}</div> : null}
        <div className="button-row">
          <button className="button" type="submit" disabled={is_submitting}>
            {is_submitting ? "Signing in..." : "Login"}
          </button>
          <button
            className="button button--ghost"
            type="button"
            disabled={is_submitting}
            onClick={(event) => handle_submit(event, "signup")}
          >
            {is_submitting ? "Creating..." : "Sign up"}
          </button>
        </div>
      </form>
    </div>
  );
}
