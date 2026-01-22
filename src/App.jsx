import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./routes/Login.jsx";
import Chapters from "./routes/Chapters.jsx";
import Study from "./routes/Study.jsx";
import Analytics from "./routes/Analytics.jsx";
import Safmeds from "./routes/Safmeds.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import TopNav from "./components/TopNav.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/chapters" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/chapters"
            element={
              <ProtectedRoute>
                <Chapters />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study/:chapter_number"
            element={
              <ProtectedRoute>
                <Study />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/:chapter_number"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/safmeds"
            element={
              <ProtectedRoute>
                <Safmeds />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/chapters" replace />} />
        </Routes>
      </main>
    </div>
  );
}
