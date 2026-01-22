import { Link, NavLink, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase_client.js";
import { use_auth } from "../auth/AuthProvider.jsx";

export default function TopNav() {
  const { user } = use_auth();
  const location = useLocation();
  const is_login = location.pathname === "/login";

  const handle_sign_out = async () => {
    await signOut(auth);
  };

  return (
    <header className="top-nav">
      <div className="top-nav__brand">
        <Link to="/chapters">Flashcards</Link>
      </div>
      {user ? (
        <nav className="top-nav__links">
          <NavLink
            to="/chapters"
            className={({ isActive }) =>
              `nav-link${isActive ? " is-active" : ""}`
            }
          >
            Chapters
          </NavLink>
          <NavLink
            to="/safmeds"
            className={({ isActive }) =>
              `nav-link${isActive ? " is-active" : ""}`
            }
          >
            Safmeds
          </NavLink>
        </nav>
      ) : null}
      <div className="top-nav__actions">
        {user ? (
          <>
            <span className="muted">{user.email}</span>
            <button className="button" onClick={handle_sign_out} type="button">
              Sign out
            </button>
          </>
        ) : (
          !is_login && (
            <Link className="button button--ghost" to="/login">
              Login
            </Link>
          )
        )}
      </div>
    </header>
  );
}
