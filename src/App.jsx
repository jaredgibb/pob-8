import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import TopNav from "./components/TopNav.jsx";

const Login = lazy(() => import("./routes/Login.jsx"));
const Chapters = lazy(() => import("./routes/Chapters.jsx"));
const Study = lazy(() => import("./routes/Study.jsx"));
const Analytics = lazy(() => import("./routes/Analytics.jsx"));
const Safmeds = lazy(() => import("./routes/Safmeds.jsx"));

export default function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-main">
        <Suspense fallback={<div className="panel">Loading...</div>}>
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
        </Suspense>
      </main>
    </div>
  );
}
