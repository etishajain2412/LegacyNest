import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";

function Profile() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50">
      <h1 className="text-2xl font-bold">Welcome to your Profile 🎉</h1>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Login />} /> {/* default to login */}
      </Routes>
    </Router>
  );
}
