import { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";

const Profile = ({ user, setUser }) => {
  const [editName, setEditName] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [editBirthYear, setEditBirthYear] = useState(false);

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState(user?.name || "");
  const [birthYear, setBirthYear] = useState(user?.birthYear ?? "");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ============================================================
  // FETCH COMPLETE PROFILE
  // ============================================================

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        setError("");

        const response = await axiosInstance.get("/profile", {
          withCredentials: true,
        });

        const profileUser = response.data;

        console.log("Profile received from backend:", profileUser);
        console.log("Birth year:", profileUser.birthYear);

        // Update global user state
        setUser(profileUser);

        // Update local states
        setName(profileUser.name || "");
        setBirthYear(profileUser.birthYear ?? "");
      } catch (error) {
        console.error("Failed to fetch profile:", error);

        setError(
          error.response?.data?.message ||
            "Failed to load profile"
        );
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [setUser]);

  // ============================================================
  // KEEP LOCAL STATE SYNCHRONIZED WITH USER
  // ============================================================

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBirthYear(user.birthYear ?? "");
    }
  }, [user]);

  // ============================================================
  // UPDATE NAME
  // ============================================================

  const handleUpdateName = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.put(
        "/profile",
        { name },
        {
          withCredentials: true,
        }
      );

      const updatedUser = response.data.user;

      console.log("Updated user:", updatedUser);

      setUser(updatedUser);
      setName(updatedUser.name || "");
      setBirthYear(updatedUser.birthYear ?? "");

      setEditName(false);
      setMessage("Name updated successfully");

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Name update error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to update name"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UPDATE BIRTH YEAR
  // ============================================================

  const handleUpdateBirthYear = async (e) => {
    e.preventDefault();

    if (
      birthYear === "" ||
      birthYear === null ||
      birthYear === undefined
    ) {
      setError("Birth year is required");
      return;
    }

    const by = Number(birthYear);
    const currentYear = new Date().getFullYear();

    if (!Number.isFinite(by) || !Number.isInteger(by)) {
      setError("Birth year must be an integer");
      return;
    }

    if (by < 1900 || by > currentYear) {
      setError(
        `Birth year must be between 1900 and ${currentYear}`
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.put(
        "/profile",
        { birthYear: by },
        {
          withCredentials: true,
        }
      );

      const updatedUser = response.data.user;

      console.log("Updated profile:", updatedUser);
      console.log("Updated birth year:", updatedUser.birthYear);

      setUser(updatedUser);

      setName(updatedUser.name || "");
      setBirthYear(updatedUser.birthYear ?? "");

      setEditBirthYear(false);
      setMessage("Birth year updated successfully");

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Birth year update error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to update birth year"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UPDATE PASSWORD
  // ============================================================

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
      await axiosInstance.put(
        "/profile/password",
        { newPassword },
        {
          withCredentials: true,
        }
      );

      setChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");

      setMessage("Password updated successfully");

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Password update error:", error);

      setError(
        error.response?.data?.message ||
          "Failed to update password"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-black">
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">

        {/* SUCCESS MESSAGE */}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 text-center font-medium">
            {message}
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-center font-medium">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-black">

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-serif font-semibold">
              Profile
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* ================================================= */}
            {/* LEFT SIDE */}
            {/* ================================================= */}

            <div className="md:col-span-1">

              <div className="text-center">

                <div className="w-32 h-32 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>

                <h2 className="text-xl font-semibold">
                  {user?.name}
                </h2>

                <p className="text-gray-600">
                  @{user?.username}
                </p>

                <p className="text-gray-600">
                  {user?.email}
                </p>

                {user?.isOAuthUser && (
                  <p className="text-sm text-blue-600 mt-2">
                    Signed in with Google
                  </p>
                )}

              </div>

            </div>

            {/* ================================================= */}
            {/* RIGHT SIDE */}
            {/* ================================================= */}

            <div className="md:col-span-2">

              <div className="space-y-6">

                <div>

                  <h3 className="text-lg font-semibold mb-4 font-serif">
                    Account Settings
                  </h3>

                  {/* ================================================= */}
                  {/* NAME */}
                  {/* ================================================= */}

                  <div className="bg-gray-50 p-4 rounded-lg border-2 border-black">

                    {!editName ? (
                      <div className="flex justify-between items-center">

                        <div>
                          <p className="font-medium">
                            Name
                          </p>

                          <p className="text-gray-600">
                            {user?.name}
                          </p>
                        </div>

                        <button
                          onClick={() => setEditName(true)}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                        >
                          Change Name
                        </button>

                      </div>
                    ) : (
                      <form
                        onSubmit={handleUpdateName}
                        className="space-y-4"
                      >

                        <div>

                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name
                          </label>

                          <input
                            type="text"
                            value={name}
                            onChange={(e) =>
                              setName(e.target.value)
                            }
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
                            {loading
                              ? "Updating..."
                              : "Save Name"}
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

                  {/* ================================================= */}
                  {/* BIRTH YEAR */}
                  {/* ================================================= */}

                  <div className="bg-gray-50 p-4 rounded-lg mt-4 border-2 border-black">

                    {!editBirthYear ? (
                      <div className="flex justify-between items-center">

                        <div>

                          <p className="font-medium">
                            Birth Year
                          </p>

                          <p className="text-gray-600">

                            {user?.birthYear !== undefined &&
                            user?.birthYear !== null &&
                            user?.birthYear !== ""
                              ? `${user.birthYear} (age: ${
                                  user.age ??
                                  new Date().getFullYear() -
                                    Number(user.birthYear)
                                })`
                              : "Not set"}

                          </p>

                        </div>

                        <button
                          onClick={() =>
                            setEditBirthYear(true)
                          }
                          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                        >
                          {user?.birthYear
                            ? "Change Birth Year"
                            : "Add Birth Year"}
                        </button>

                      </div>
                    ) : (
                      <form
                        onSubmit={handleUpdateBirthYear}
                        className="space-y-4"
                      >

                        <div>

                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Birth Year
                          </label>

                          <input
                            type="number"
                            value={birthYear}
                            onChange={(e) =>
                              setBirthYear(e.target.value)
                            }
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                            min={1900}
                            max={new Date().getFullYear()}
                            required
                          />

                        </div>

                        <div className="flex gap-4">

                          <button
                            type="submit"
                            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                            disabled={loading}
                          >
                            {loading
                              ? "Updating..."
                              : user?.birthYear
                              ? "Update Birth Year"
                              : "Save Birth Year"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditBirthYear(false);
                              setBirthYear(
                                user?.birthYear ?? ""
                              );
                            }}
                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
                          >
                            Cancel
                          </button>

                        </div>

                      </form>
                    )}

                  </div>

                  {/* ================================================= */}
                  {/* PASSWORD */}
                  {/* ================================================= */}

                  <div className="bg-gray-50 p-4 rounded-lg mt-4 border-2 border-black">

                    {!changePassword ? (
                      <div className="flex justify-between items-center">

                        <div>

                          <p className="font-medium">
                            Password
                          </p>

                          <p className="text-gray-600">
                            {user?.isOAuthUser
                              ? "Set a password to enable email login"
                              : "••••••••"}
                          </p>

                        </div>

                        <button
                          onClick={() =>
                            setChangePassword(true)
                          }
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                        >
                          {user?.isOAuthUser
                            ? "Set Password"
                            : "Change Password"}
                        </button>

                      </div>
                    ) : (
                      <form
                        onSubmit={handleUpdatePassword}
                        className="space-y-4"
                      >

                        <div>

                          <p className="text-sm text-gray-600 mb-4">
                            {user?.isOAuthUser
                              ? "Set a password to enable email/password login"
                              : "Change your password"}
                          </p>

                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>

                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) =>
                              setNewPassword(e.target.value)
                            }
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
                            onChange={(e) =>
                              setConfirmPassword(e.target.value)
                            }
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
                              : user?.isOAuthUser
                              ? "Set Password"
                              : "Update Password"}
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