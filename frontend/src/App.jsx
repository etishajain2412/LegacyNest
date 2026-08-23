import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import FrontPage from "./pages/FrontPage";
import Upload from "./pages/Upload";
import Timeline from "./pages/Timeline";
import ViewStory from "./pages/ViewStory";
import EditStory from "./pages/EditStory";
import Register from "./pages/Register";
import Login from "./pages/Login";
import BackButton from "./components/Back";
import Profile from "./pages/Profile";
import Stories from "./pages/Stories";
import FamilyCircles from "./pages/FamilyCircles";
import FeedPage from "./pages/FeedPage";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axiosInstance from "./utils/axiosInstance";
import PromptsPage from "./pages/PromptsPage"; 
import MatchesPage from "./pages/MatchesPage";
import FamilyFeed from "./pages/FamilyFeed";

import FamilyChatbot from "./pages/FamilyChatbot";
import FamilyRoom from "./pages/FamilyRoom";

import CalendarPage from "./pages/Calendar";
import StoryReport from "./pages/StoryReport";
import StoriesByCategory from "./pages/StoriesByCategory";

function ProtectedRoute({ user, authLoading, children }) {
  if (authLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const hydrateUser = async () => {
      try {
        const response = await fetch(
          `${axiosInstance.defaults.baseURL}/profile`,
          { credentials: "include" }
        );

        if (response.ok) {
          setUser(await response.json());
          return;
        }

        setUser(null);
      } catch (error) {
        const userCookie = Cookies.get("user");

        if (userCookie) {
          try {
            setUser(JSON.parse(userCookie));
          } catch (parseError) {
            Cookies.remove("user");
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setAuthLoading(false);
      }
    };

    hydrateUser();
  }, []);

  return (
    <Router>
      <BackButton />
      <Routes>
        <Route path="/register" element={<Register setUser={setUser} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />

        <Route
          path="/profilepage"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <Profile user={user} setUser={setUser} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <FrontPage user={user} setUser={setUser} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <Upload user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/timeline"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <Timeline user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stories"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <Stories user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/circles"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <FamilyCircles user={user} />
            </ProtectedRoute>
          }
        />
<Route
  path="/familyroom"
  element={
    <ProtectedRoute user={user} authLoading={authLoading}>
      <FamilyRoom user={user} />
    </ProtectedRoute>
  }
/>

<Route
  path="/familychatbot"
  element={
    <ProtectedRoute user={user} authLoading={authLoading}>
      <FamilyChatbot user={user} />
    </ProtectedRoute>
  }
/>

        <Route path="/feed" element={<ProtectedRoute user={user} authLoading={authLoading}><FeedPage user={user} /> </ProtectedRoute>} />


        <Route
          path="/stories/view/:id"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <ViewStory user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stories/edit/:id"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <EditStory user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stories/ai/:id"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <StoryReport user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stories/categories"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <StoriesByCategory user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <CalendarPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prompts"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <PromptsPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <MatchesPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/familyfeed"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <FamilyFeed user={user} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
