import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import TopNav from "./components/TopNav.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-main">
        <Suspense fallback={<div className="panel">Loading...</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
