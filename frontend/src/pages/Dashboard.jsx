// pages/Dashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  Share2,
  Upload,
  Clock,
  User as UserIcon,
} from "lucide-react";

const Dashboard = ({ user }) => {
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Welcome to Family Trunk,{" "}
            <span className="text-indigo-600">{user.name}</span>!
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Preserving your family stories across generations
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <DashboardCard
            icon={<BookOpen className="w-6 h-6 text-indigo-600" />}
            title="My Stories"
            description="View and manage your stories"
            to="/stories"
            button="View My Stories"
          />

          <DashboardCard
            icon={<Users className="w-6 h-6 text-green-600" />}
            title="Family Circles"
            description="Manage your family circles"
            to="/circles"
            button="Manage Circles"
          />

          <DashboardCard
            icon={<Share2 className="w-6 h-6 text-purple-600" />}
            title="Shared Stories"
            description="Stories shared with you"
            to="/stories?view=shared"
            button="View Shared Stories"
            color="gray"
          />

          <DashboardCard
            icon={<Upload className="w-6 h-6 text-blue-600" />}
            title="Upload Story"
            description="Add new stories and memories"
            to="/upload"
            button="Upload New Story"
          />

          <DashboardCard
            icon={<Clock className="w-6 h-6 text-orange-600" />}
            title="Timeline"
            description="See your stories on a timeline"
            to="/timeline"
            button="View Timeline"
          />

          <DashboardCard
            icon={<UserIcon className="w-6 h-6 text-pink-600" />}
            title="Profile"
            description="Manage your account settings"
            to="/profile"
            button="Profile"
            color="gray"
          />
        </div>
      </div>
    </div>
  );
};

const DashboardCard = ({
  icon,
  title,
  description,
  to,
  button,
  color = "indigo",
}) => {
  const bgColor = {
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    gray: "bg-gray-600 hover:bg-gray-700",
  }[color];

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            {icon}
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
        <Link
          to={to}
          className={`${bgColor} mt-auto text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 text-center block`}
        >
          {button}
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
