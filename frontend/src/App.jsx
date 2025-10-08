import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import FrontPage from "./pages/frontpage";
import Upload from "./pages/Upload";
import Timeline from "./pages/Timeline";
import ViewStory from "./pages/ViewStory";
import EditStory from "./pages/EditStory";
import Register from "./pages/Register";
import Login from "./pages/Login";
import BackButton from "./components/Back";
import Profile from "./pages/Profile";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import PromptsPage from "./pages/PromptsPage"; 
import CalendarPage from "./pages/Calendar";
import StoryReport from "./pages/StoryReport";


function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userCookie = Cookies.get("user");
    const accessToken = Cookies.get("accessToken");

    if (userCookie) {
      try {
        const userData = JSON.parse(userCookie);
        setUser(userData);
      } catch (error) {
        Cookies.remove("user");
        Cookies.remove("accessToken");
      }
    }
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
            <ProtectedRoute user={user}>
              <Profile user={user} setUser={setUser} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <FrontPage user={user} setUser={setUser} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute user={user}>
              <Upload user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/timeline"
          element={
            <ProtectedRoute user={user}>
              <Timeline user={user} />
            </ProtectedRoute>
          }
        />



        
        <Route
          path="/stories/edit/:id"
          element={
            <ProtectedRoute user={user}>
              <EditStory user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stories/ai/:id"
          element={
            <ProtectedRoute user={user}>
              <StoryReport user={user} />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/calendar"
          element={
            <ProtectedRoute user={user}>
              <CalendarPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prompts"
          element={
            <ProtectedRoute user={user}>
              <PromptsPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
