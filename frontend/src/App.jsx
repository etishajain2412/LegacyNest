import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import FrontPage from "./pages/frontpage";
import Upload from "./pages/Upload";
import Timeline from "./pages/Timeline";
import Register from "./pages/Register";
import Login from "./pages/Login";
import { useState } from "react";

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null); 

  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register setUser={setUser} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <FrontPage user={user} />
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

        {/* Default */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
