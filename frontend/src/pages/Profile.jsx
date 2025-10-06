import { useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import Cookies from "js-cookie";
import { Loader2, Edit3, Lock, Save, XCircle } from "lucide-react";

const Profile = ({ user, setUser }) => {
  const [editName, setEditName] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState(user?.name || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.put("/profile", { name });
      setUser(response.data.user);
      Cookies.set("user", JSON.stringify(response.data.user), {
        expires: new Date(Date.now() + 15 * 60 * 1000),
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      setEditName(false);
      setMessage("Name updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update name");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axiosInstance.put("/profile/password", { newPassword });
      setChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update password");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] font-serif text-gray-900 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Alerts */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 text-center font-medium">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-center font-medium">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white shadow-md border border-gray-200 rounded-2xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="text-center sm:text-left">
              <div className="w-32 h-32 bg-gray-800 text-white rounded-full flex items-center justify-center text-5xl font-bold mx-auto sm:mx-0 mb-4">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-3xl font-semibold">{user?.name}</h1>
              <p className="text-gray-600 mt-1">@{user?.username}</p>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white shadow-md border border-gray-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Account Settings</h2>

          {/* Name Section */}
          <div className="bg-[#f9f8f6] p-5 rounded-xl border border-gray-100 mb-6">
            {!editName ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-lg text-gray-900">Name</p>
                  <p className="text-gray-600">{user?.name}</p>
                </div>
                <button
                  onClick={() => setEditName(true)}
                  className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                >
                  <Edit3 size={18} /> Change
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateName} className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  New Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-700 outline-none"
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(false);
                      setName(user?.name || "");
                    }}
                    className="flex items-center gap-2 bg-gray-300 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    <XCircle size={18} /> Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Password Section */}
          <div className="bg-[#f9f8f6] p-5 rounded-xl border border-gray-100">
            {!changePassword ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-lg text-gray-900">Password</p>
                  <p className="text-gray-600">••••••••</p>
                </div>
                <button
                  onClick={() => setChangePassword(true)}
                  className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition"
                >
                  <Lock size={18} /> Change
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Change your password below
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-600 outline-none"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-600 outline-none"
                    placeholder="Confirm password"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-green-700 text-white px-5 py-2 rounded-lg hover:bg-green-800 transition"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangePassword(false);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="flex items-center gap-2 bg-gray-300 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    <XCircle size={18} /> Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
