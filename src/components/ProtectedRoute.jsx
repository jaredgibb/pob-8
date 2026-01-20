import { Navigate } from "react-router-dom";
import { use_auth } from "../auth/AuthProvider.jsx";

export default function ProtectedRoute({ children }) {
  const { user, is_loading } = use_auth();

  if (is_loading) {
    return (
      <div className="panel">
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
