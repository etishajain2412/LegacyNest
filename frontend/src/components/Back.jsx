import { useLocation, useNavigate } from "react-router-dom";

export default function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/profile") return null;
    console.log("Current path:", location.pathname);
  return (
    <button
      onClick={() => navigate(-1)}
      className="fixed top-4 left-6 p-2 rounded-full bg-gray-900 text-white shadow hover:bg-gray-800 z-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
}
