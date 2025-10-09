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
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 ">
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

        <div className="bg-white rounded-lg shadow-md p-6 border-1 border-2 border-black">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-serif font-semibold">Profile</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="text-center">
                <div className="w-32 h-32 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-semibold">{user?.name}</h2>
                <p className="text-gray-600">@{user?.username}</p>
                <p className="text-gray-600">{user?.email}</p>
                {!user?.password && (
                  <p className="text-sm text-blue-600 mt-2">
                    Signed in with Google
                  </p>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 font-serif">
                    Account Settings
                  </h3>

                  <div className="bg-gray-50 p-4 rounded-lg border-1 border-2 border-black">
                    {!editName ? (
                      <div className="flex justify-between items-center ">
                        <div>
                          <p className="font-medium ">Name</p>
                          <p className="text-gray-600">{user?.name}</p>
                        </div>
                        <button
                          onClick={() => setEditName(true)}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                        >
                          Change Name
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleUpdateName} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="flex gap-4">
                          <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                            disabled={loading}
                          >
                            {loading ? "Updating..." : "Save Name"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditName(false);
                              setName(user?.name || "");
                            }}
                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mt-4 border-1 border-2 border-black">
                    {!changePassword ? (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Password</p>
                          <p className="text-gray-600">
                            {user?.password
                              ? "••••••••"
                              : "Set a password to enable email login"}
                          </p>
                        </div>
                        <button
                          onClick={() => setChangePassword(true)}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                        >
                          {user?.password ? "Change Password" : "Set Password"}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-4">
                            {user?.password
                              ? "Change your password"
                              : "Set a password to enable email/password login"}
                          </p>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500"
                            placeholder="Enter new password"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500"
                            placeholder="Confirm new password"
                            required
                          />
                        </div>
                        <div className="flex gap-4">
                          <button
                            type="submit"
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                            disabled={loading}
                          >
                            {loading
                              ? "Updating..."
                              : user?.password
                              ? "Update Password"
                              : "Set Password"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChangePassword(false);
                              setNewPassword("");
                              setConfirmPassword("");
                            }}
                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
