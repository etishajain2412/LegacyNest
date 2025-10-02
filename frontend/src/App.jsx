import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FrontPage from "./pages/frontpage";
import Upload from "./pages/Upload";
import Timeline from "./pages/Timeline";

function App() {
  const user = { id: "6521f30abc1234567890abcd", name: "Test User" };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<FrontPage />} />
        <Route path="/upload" element={<Upload user={user} />} />
        <Route path="/timeline" element={<Timeline />} />
      </Routes>
    </Router>
  );
}

export default App;
