import { useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";

export default function FamilyCircles({ user, setUser }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleDesc, setNewCircleDesc] = useState("");
  const [joinCircleId, setJoinCircleId] = useState("");
  const [addMemberUsername, setAddMemberUsername] = useState("");
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [adminPendingRequests, setAdminPendingRequests] = useState([]);
  const [userPendingRequests, setUserPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("myCircles");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasAdminCircles, setHasAdminCircles] = useState(false);

  useEffect(() => {
    fetchUserCircles();
  }, []);

  useEffect(() => {
    if (activeTab === "adminRequests") {
      fetchAdminPendingRequests();
    }
    if (activeTab === "myRequests") {
      fetchUserPendingRequests();
    }
  }, [activeTab]);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      setUser(null);
      navigate("/login");
    } catch (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      setUser(null);
      navigate("/login");
    }
  };

  const fetchUserCircles = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/circles/my-circles");
      setCircles(response.data.circles);
      
      const adminCircles = response.data.circles.filter(circle => isUserAdmin(circle));
      setHasAdminCircles(adminCircles.length > 0);
    } catch (err) {
      console.error("Error fetching circles:", err);
      setError(err.response?.data?.message || "Failed to fetch circles");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminPendingRequests = async () => {
    try {
      const response = await axiosInstance.get("/circles/admin/pending-requests");
      setAdminPendingRequests(response.data.pendingRequests || []);
    } catch (err) {
      console.error("Error fetching admin requests:", err);
      setError(err.response?.data?.message || "Failed to fetch admin requests");
    }
  };

  const fetchUserPendingRequests = async () => {
    try {
      const response = await axiosInstance.get("/circles/user/pending-requests");
      setUserPendingRequests(response.data.pendingRequests || []);
    } catch (err) {
      console.error("Error fetching user requests:", err);
      setError(err.response?.data?.message || "Failed to fetch your requests");
    }
  };

  const handleCreateCircle = async (e) => {
    e.preventDefault();
    if (!newCircleName.trim()) return;

    try {
      setLoading(true);
      await axiosInstance.post("/circles/create", {
        name: newCircleName,
        description: newCircleDesc,
      });

      setSuccess("✅ Circle created successfully!");
      setNewCircleName("");
      setNewCircleDesc("");
      fetchUserCircles();
      setActiveTab("myCircles");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create circle");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestToJoin = async (e) => {
    e.preventDefault();
    if (!joinCircleId.trim()) return;

    try {
      setLoading(true);
      await axiosInstance.post("/circles/request-join", {
        circleId: joinCircleId,
      });

      setSuccess("✅ Join request sent! Waiting for admin approval.");
      setJoinCircleId("");
      fetchUserPendingRequests();
      setActiveTab("myRequests");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send join request");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (circleId) => {
    if (!window.confirm("Are you sure you want to cancel this join request?")) return;

    try {
      await axiosInstance.post("/circles/cancel-request", {
        circleId,
      });

      setSuccess("Join request cancelled successfully");
      fetchUserPendingRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel request");
    }
  };

  const handleProcessRequest = async (circleId, requestId, action) => {
    try {
      await axiosInstance.post(`/circles/${circleId}/process-request`, {
        requestId,
        action,
      });

      setSuccess(`Join request ${action}d successfully`);
      fetchAdminPendingRequests();
      fetchUserCircles();
      
      if (selectedCircle && selectedCircle._id === circleId) {
        const response = await axiosInstance.get(`/circles/${circleId}`);
        setSelectedCircle(response.data.circle);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} request`);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addMemberUsername.trim()) return;

    try {
      await axiosInstance.post(`/circles/${selectedCircle._id}/add-member`, {
        usernameOrEmail: addMemberUsername,
        role: "viewer",
      });

      setSuccess("Member added successfully");
      setAddMemberUsername("");
      fetchUserCircles();
      const response = await axiosInstance.get(`/circles/${selectedCircle._id}`);
      setSelectedCircle(response.data.circle);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add member");
    }
  };

  const handleMakeAdmin = async (memberId) => {
    if (!window.confirm("Are you sure you want to make this member an admin?")) return;

    try {
      await axiosInstance.post(`/circles/${selectedCircle._id}/make-admin`, {
        memberId,
      });

      setSuccess("Member promoted to admin successfully");
      fetchUserCircles();
      const response = await axiosInstance.get(`/circles/${selectedCircle._id}`);
      setSelectedCircle(response.data.circle);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to promote member");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;

    try {
      await axiosInstance.delete(`/circles/${selectedCircle._id}/member`, {
        data: { memberId }
      });

      setSuccess("Member removed successfully");
      fetchUserCircles();
      const response = await axiosInstance.get(`/circles/${selectedCircle._id}`);
      setSelectedCircle(response.data.circle);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleLeaveCircle = async (circleId) => {
    if (!window.confirm("Are you sure you want to leave this circle?")) return;

    try {
      await axiosInstance.post(`/circles/${circleId}/leave`);
      setSuccess("✅ Successfully left the circle");
      fetchUserCircles();
      setSelectedCircle(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to leave circle");
    }
  };

  const handleDeleteCircle = async (circleId) => {
    if (!window.confirm("Are you sure you want to delete this circle? This action cannot be undone.")) return;

    try {
      await axiosInstance.delete(`/circles/${circleId}`);
      setSuccess("✅ Circle deleted successfully");
      fetchUserCircles();
      setSelectedCircle(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete circle");
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      await axiosInstance.put(`/circles/${selectedCircle._id}/member-role`, {
        memberId,
        newRole
      });

      setSuccess("Member role updated successfully");
      const response = await axiosInstance.get(`/circles/${selectedCircle._id}`);
      setSelectedCircle(response.data.circle);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update member role");
    }
  };

  const isUserCreator = (circle) => {
    return circle.createdBy._id === localStorage.getItem("userId");
  };

  const isUserAdmin = (circle) => {
    if (!circle) return false;
    if (circle.createdBy._id === localStorage.getItem("userId")) return true;
    const member = circle.members.find(m => m.user._id === localStorage.getItem("userId"));
    return member ? member.role === "admin" : false;
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      admin: "bg-red-100 text-red-800 border border-red-200",
      contributor: "bg-blue-100 text-blue-800 border border-blue-200",
      viewer: "bg-gray-100 text-gray-800 border border-gray-200"
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[role]}`}>
        {role}
      </span>
    );
  };

  const allTabs = [
    { key: "myCircles", label: "My Circles" },
    { key: "create", label: "Create Circle" },
    { key: "join", label: "Join Circle" },
    { key: "myRequests", label: `My Requests ${userPendingRequests.length > 0 ? `(${userPendingRequests.length})` : ''}` },
    { key: "adminRequests", label: `Admin Requests ${adminPendingRequests.length > 0 ? `(${adminPendingRequests.length})` : ''}` }
  ];

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-4xl font-bold font-serif text-gray-900 cursor-pointer" onClick={() => navigate("/")}>
              LegacyNest
            </h1>

            <div className="flex items-center gap-4">
              <p className="text-xl text-gray-800 font-serif hidden md:block">
                Welcome back, {user?.name}
              </p>

              <div className="relative">
                <img
                  src={user?.avatar || "https://i.pravatar.cc/40"}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={toggleDropdown}
                />

              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center font-serif">Family Circles</h2>
            
            <div className="border-b-2 border-gray-200 mb-8">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {allTabs.map(tab => (
                  <button
                    key={tab.key}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.key 
                        ? "border-blue-600 text-blue-600" 
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setError("");
                      setSuccess("");
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                  <button 
                    onClick={() => setError("")}
                    className="ml-auto bg-red-50 rounded-lg p-1.5 text-red-500 hover:bg-red-100 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                  <button 
                    onClick={() => setSuccess("")}
                    className="ml-auto bg-green-50 rounded-lg p-1.5 text-green-500 hover:bg-green-100 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "myCircles" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold text-gray-900 font-serif">My Family Circles</h3>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors border-2 border-blue-600"
                  >
                    Create New Circle
                  </button>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : circles.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No circles yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating your first family circle.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => setActiveTab("create")}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors border-2 border-blue-600"
                      >
                        Create Circle
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {circles.map((circle) => (
                      <div key={circle._id} className="bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300">
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-lg font-semibold text-gray-900 truncate">{circle.name}</h4>
                            <div className="flex gap-1 ml-2">
                              {isUserCreator(circle) && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium border border-purple-200">Creator</span>
                              )}
                              {isUserAdmin(circle) && !isUserCreator(circle) && (
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium border border-red-200">Admin</span>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {circle.description || "No description provided"}
                          </p>
                          <div className="flex justify-between text-sm text-gray-500 mb-4">
                            <span>👥 {circle.members.filter((member) => member.user._id !== circle.createdBy._id).length + 1} members</span>
                            <span>📅 {new Date(circle.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button 
                              onClick={() => setSelectedCircle(circle)}
                              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors border-2 border-blue-600"
                            >
                              View Details
                            </button>
                            {isUserAdmin(circle) && circle.joinRequests?.filter(r => r.status === 'pending').length > 0 && (
                              <button 
                                onClick={() => {
                                  setSelectedCircle(circle);
                                }}
                                className="bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors border-2 border-orange-500"
                              >
                                {circle.joinRequests.filter(r => r.status === 'pending').length} Pending
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "create" && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg">
                  <div className="mb-8">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2 font-serif">Create New Circle</h3>
                    <p className="text-gray-600">Create a private family circle to connect with your loved ones.</p>
                  </div>
                  
                  <form onSubmit={handleCreateCircle} className="space-y-6">
                    <div>
                      <label htmlFor="circleName" className="block text-sm font-medium text-gray-700 mb-2">
                        Circle Name *
                      </label>
                      <input
                        type="text"
                        id="circleName"
                        value={newCircleName}
                        onChange={(e) => setNewCircleName(e.target.value)}
                        placeholder="Enter circle name"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="circleDescription" className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        id="circleDescription"
                        value={newCircleDesc}
                        onChange={(e) => setNewCircleDesc(e.target.value)}
                        placeholder="Enter description (optional)"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        rows="4"
                      />
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveTab("myCircles")}
                        className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors border-2 border-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2 border-green-600"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating...
                          </span>
                        ) : (
                          "Create Circle"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === "join" && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg">
                  <div className="mb-8">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2 font-serif">Join a Circle</h3>
                    <p className="text-gray-600">Request to join an existing family circle by entering its Circle ID.</p>
                  </div>
                  
                  <form onSubmit={handleRequestToJoin} className="space-y-6">
                    <div>
                      <label htmlFor="circleId" className="block text-sm font-medium text-gray-700 mb-2">
                        Circle ID *
                      </label>
                      <input
                        type="text"
                        id="circleId"
                        value={joinCircleId}
                        onChange={(e) => setJoinCircleId(e.target.value)}
                        placeholder="Enter circle ID"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700">
                            Ask the circle admin for the Circle ID. Your request will be sent for approval.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveTab("myCircles")}
                        className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors border-2 border-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2 border-blue-600"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sending...
                          </span>
                        ) : (
                          "Request to Join"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === "myRequests" && (
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6 font-serif">My Pending Join Requests</h3>
                
                {userPendingRequests.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No pending requests</h3>
                    <p className="mt-1 text-sm text-gray-500">You haven't sent any join requests yet.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => setActiveTab("join")}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors border-2 border-blue-600"
                      >
                        Join a Circle
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userPendingRequests.map((item, index) => (
                      <div key={index} className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="text-xl font-semibold text-gray-900 mb-2">{item.circle.name}</h4>
                            {item.circle.description && (
                              <p className="text-gray-600 mb-3">{item.circle.description}</p>
                            )}
                          </div>
                          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium border border-yellow-200">
                            ⏳ Pending Approval
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <strong>Circle Creator:</strong> <span className="ml-1">{item.circle.createdBy.name}</span>
                          </div>
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <strong>Members:</strong> <span className="ml-1">{item.circle.memberCount}</span>
                          </div>
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <strong>Requested:</strong> <span className="ml-1">{new Date(item.requestedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                            <strong>Circle ID:</strong> <code className="ml-1 bg-gray-100 px-2 py-1 rounded text-xs font-mono border">{item.circle._id}</code>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => handleCancelRequest(item.circle._id)}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors border-2 border-red-600"
                          >
                            Cancel Request
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "adminRequests" && (
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6 font-serif">Pending Join Requests for Your Circles</h3>
                
                {adminPendingRequests.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No pending requests</h3>
                    <p className="mt-1 text-sm text-gray-500">All clear! No pending join requests for your circles.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {adminPendingRequests.map((request, index) => (
                      <div key={index} className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="text-xl font-semibold text-gray-900 mb-2">{request.circle.name}</h4>
                            <p className="text-gray-600">
                              Request from: <strong>{request.user.name}</strong> ({request.user.email})
                            </p>
                          </div>
                          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium border border-yellow-200">
                            ⏳ Waiting Approval
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-6">
                          <div className="flex items-center">
                            <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <strong>Requested:</strong> <span className="ml-1">{new Date(request.requestedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                          <strong>Circle ID:</strong> <code className="ml-1 bg-gray-100 px-2 py-1 rounded text-xs font-mono border">{request.circle._id}</code>
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => handleProcessRequest(request.circleId, request._id, 'approve')}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors border-2 border-green-600"
                        >
                          Approve Request
                        </button>
                        <button
                          onClick={() => handleProcessRequest(request.circleId, request._id, 'reject')}
                          className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors border-2 border-red-600"
                        >
                          Reject Request
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedCircle && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-200">
                <div className="p-6 border-b-2 border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 font-serif">{selectedCircle.name}</h3>
                      <p className="text-gray-600 mt-1">{selectedCircle.description || "No description provided"}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedCircle(null)} 
                      className="text-gray-400 hover:text-gray-600 text-xl bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors border-2 border-gray-200"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {isUserAdmin(selectedCircle) && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 font-serif">Admin Controls</h4>
                      
                      <form onSubmit={handleAddMember} className="flex gap-3 mb-6">
                        <input
                          type="text"
                          value={addMemberUsername}
                          onChange={(e) => setAddMemberUsername(e.target.value)}
                          placeholder="Enter username or email to add member"
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <button 
                          type="submit" 
                          className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 whitespace-nowrap transition-colors border-2 border-green-600"
                        >
                          Add Member
                        </button>
                      </form>

                      {selectedCircle.joinRequests && selectedCircle.joinRequests.filter(r => r.status === 'pending').length > 0 && (
                        <div className="mt-6">
                          <h5 className="font-semibold text-gray-900 mb-4 text-lg font-serif">
                            Pending Join Requests ({selectedCircle.joinRequests.filter(r => r.status === 'pending').length})
                          </h5>
                          <div className="space-y-3">
                            {selectedCircle.joinRequests
                              .filter(request => request.status === 'pending')
                              .map((request) => (
                                <div key={request._id} className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-medium text-gray-900">{request.user.name}</p>
                                      <p className="text-sm text-gray-600">{request.user.email}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Requested: {new Date(request.requestedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleProcessRequest(selectedCircle._id, request._id, 'approve')}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors border-2 border-green-600"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleProcessRequest(selectedCircle._id, request._id, 'reject')}
                                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors border-2 border-red-600"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          setActiveTab("adminRequests");
                          setSelectedCircle(null);
                          fetchAdminPendingRequests();
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 mt-4 transition-colors border-2 border-blue-600"
                      >
                        View All Pending Requests
                      </button>
                    </div>
                  )}

                  <div className="mb-8">
                    <h4 className="text-xl font-semibold text-gray-900 mb-4 font-serif">
                      Members ({selectedCircle.members.filter((member) => member.user._id !== selectedCircle.createdBy._id).length + 1})
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-purple-700">
                            {selectedCircle.createdBy.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">{selectedCircle.createdBy.name}</span>
                            <span className="text-sm text-purple-600 ml-2 font-medium">(Creator)</span>
                          </div>
                        </div>
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium border border-purple-200">
                          Creator
                        </span>
                      </div>

                      {selectedCircle.members
                        .filter((member) => member.user._id !== selectedCircle.createdBy._id)
                        .map((member) => (
                        <div key={member._id} className="flex justify-between items-center p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-blue-700">
                              {member.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{member.user.name}</span>
                              <p className="text-sm text-gray-500">
                                Joined {new Date(member.joinedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getRoleBadge(member.role)}
                            
                            {isUserAdmin(selectedCircle) && member.user._id !== localStorage.getItem("userId") && (
                              <div className="flex gap-2">
                                {isUserCreator(selectedCircle) && member.role !== 'admin' && (
                                  <button
                                    onClick={() => handleMakeAdmin(member._id)}
                                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-purple-700 transition-colors border-2 border-purple-600"
                                    title="Make Admin"
                                  >
                                    Make Admin
                                  </button>
                                )}
                                
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateMemberRole(member._id, e.target.value)}
                                  className="border-2 border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  disabled={member.user._id === selectedCircle.createdBy._id}
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="contributor">Contributor</option>
                                  <option value="admin" disabled={!isUserCreator(selectedCircle)}>Admin</option>
                                </select>
                                
                                <button
                                  onClick={() => handleRemoveMember(member._id)}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-700 transition-colors border-2 border-red-600"
                                  title="Remove Member"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6 border-t-2 border-gray-200 flex-wrap">
                    {!isUserCreator(selectedCircle) && (
                      <button
                        onClick={() => handleLeaveCircle(selectedCircle._id)}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors border-2 border-red-600"
                      >
                        Leave Circle
                      </button>
                    )}
                    
                    {isUserCreator(selectedCircle) && (
                      <button
                        onClick={() => handleDeleteCircle(selectedCircle._id)}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors border-2 border-red-600"
                      >
                        Delete Circle
                      </button>
                    )}
                    
                    <button
                      onClick={() => setSelectedCircle(null)}
                      className="bg-gray-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors border-2 border-gray-500"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-6 text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                    <p><strong>Circle ID:</strong> <code className="bg-gray-200 px-2 py-1 rounded font-mono text-xs border">{selectedCircle._id}</code></p>
                    <p className="mt-2">Share this ID with others so they can request to join.</p>
                    <p className="mt-2"><strong>Created:</strong> {new Date(selectedCircle.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
    </>
  );
}