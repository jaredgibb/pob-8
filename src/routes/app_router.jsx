import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import App from "../App.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";

// Lazy load route components
const Login = lazy(() => import("./Login.jsx"));
const Chapters = lazy(() => import("./Chapters.jsx"));
const Study = lazy(() => import("./Study.jsx"));
const Analytics = lazy(() => import("./Analytics.jsx"));
const Safmeds = lazy(() => import("./Safmeds.jsx"));

// Create the router configuration
export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // App is now the layout component
    children: [
      {
        index: true,
        element: <Navigate to="/chapters" replace />,
      },
      {
        path: "login",
        element: (
          <Suspense fallback={<div className="panel">Loading...</div>}>
            <Login />
          </Suspense>
        ),
      },
      {
        path: "chapters",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<div className="panel">Loading...</div>}>
              <Chapters />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "study/:chapter_number?", // Optional param? No, usually required. But let's check App.jsx usage.
        // In App.jsx path was "/study/:chapter_number". But wait, Chapters.jsx navigates to `/study?chapters=...`
        // Let's check Study.jsx logic. If it uses searchParams, maybe it doesn't need path param?
        // Ah, Study.jsx uses `useParams` for `chapter_number` OR `useSearchParams` for `chapters`.
        // The original route in App.jsx was `/study/:chapter_number`. 
        // But Chapters.jsx pushes `/study?chapters=...`. 
        // This implies hitting `/study` (root of study path) might 404 if the route expects a param.
        // Let's check the original App.jsx route: `<Route path="/study/:chapter_number" element={<Study />} />`
        // Wait, if the user navigates to `/study?chapters=1,2`, does that match `/study/:chapter_number`? No.
        // It matches `/study` with search params.
        // If the route is defined as `/study/:chapter_number`, then `/study` (no param) would not match.
        // HOWEVER, maybe the user navigates to `/study/1`?
        // Let's look at Chapters.jsx again: `navigate('/study?chapters=${selected_list.join(",")}')`
        // This navigates to `/study`.
        // So the original route `/study/:chapter_number` likely failed for that navigation unless it was optional?
        // Wait, `path="/study/:chapter_number"` matches only if there is a segment.
        // Let's check App.jsx again.
        // `path="/study/:chapter_number"`
        // If I navigate to `/study?chapters=1`, it should NOT match `/study/:chapter_number`.
        // This suggests the previous code might have been broken or I am misinterpreting something.
        // OR `chapter_number` was optional? No, standard syntax is `:param?`.
        // Let's check if there was another route for study? 
        // No.
        // Maybe the user intends to use optional param. I will use `/study/:chapter_number?` to be safe and cover both cases.
        // Actually, let's fix the path to be `study` and child route logic if needed, or just `study/:chapter_number?`.
        // Let's use `study` and an optional param.
        element: (
          <ProtectedRoute>
             <Suspense fallback={<div className="panel">Loading...</div>}>
              <Study />
            </Suspense>
          </ProtectedRoute>
        ),
      },
       {
        path: "study", // Explicitly handle /study without param
        element: (
          <ProtectedRoute>
             <Suspense fallback={<div className="panel">Loading...</div>}>
              <Study />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "analytics/:chapter_number",
        element: (
          <ProtectedRoute>
             <Suspense fallback={<div className="panel">Loading...</div>}>
              <Analytics />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "safmeds",
        element: (
          <ProtectedRoute>
             <Suspense fallback={<div className="panel">Loading...</div>}>
              <Safmeds />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "*",
        element: <Navigate to="/chapters" replace />,
      },
    ],
  },
]);
