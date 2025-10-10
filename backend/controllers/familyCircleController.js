const FamilyCircle = require("../models/FamilyCircle");
const User = require("../models/User");

exports.createFamilyCircle = async (req, res) => {
  try {
    const { name, description, joinMethod = "admin_approval" } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Circle name is required" });
    }

    const familyCircle = new FamilyCircle({
      name,
      description,
      createdBy: req.user.id,
      settings: {
        joinMethod,
      },
      members: [
        {
          user: req.user.id,
          role: "admin",
          addedBy: req.user.id,
        },
      ],
    });

    await familyCircle.save();
    await familyCircle.populate("createdBy", "name email");
    await familyCircle.populate("members.user", "name email");

    res.status(201).json({
      message: "Family circle created successfully",
      familyCircle,
    });
  } catch (error) {
    console.error("Error creating family circle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUserCircles = async (req, res) => {
  try {
    const circles = await FamilyCircle.find({
      $or: [
        { createdBy: req.user.id },
        { "members.user": req.user.id }
      ],
      isActive: true
    })
    .populate("createdBy", "name email")
    .populate("members.user", "name email")
    .populate("joinRequests.user", "name email")
    .sort({ createdAt: -1 });

    const requestedCircles = await FamilyCircle.find({
      "joinRequests.user": req.user.id,
      "joinRequests.status": "pending",
      isActive: true
    })
    .populate("createdBy", "name email")
    .populate("members.user", "name email");

    res.json({ 
      circles,
      requestedCircles: requestedCircles || []
    });
  } catch (error) {
    console.error("Error fetching circles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getCircleById = async (req, res) => {
  try {
    const circle = await FamilyCircle.findOne({
      _id: req.params.id,
      isActive: true,
      $or: [
        { createdBy: req.user.id },
        { "members.user": req.user.id }
      ]
    })
    .populate("createdBy", "name email")
    .populate("members.user", "name email")
    .populate("joinRequests.user", "name email");

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    res.json({ circle });
  } catch (error) {
    console.error("Error fetching circle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.requestToJoin = async (req, res) => {
  try {
    const { circleId } = req.body;

    if (!circleId) {
      return res.status(400).json({ message: "Circle ID is required" });
    }

    const circle = await FamilyCircle.findOne({
      _id: circleId,
      isActive: true,
    }).populate("createdBy", "name email");

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const isMember = circle.members.some(
      member => member.user.toString() === req.user.id
    );
    if (isMember) {
      return res.status(400).json({ message: "You are already a member of this circle" });
    }

    if (circle.createdBy._id.toString() === req.user.id) {
      return res.status(400).json({ message: "You are the creator of this circle" });
    }

    const existingRequest = circle.joinRequests.find(
      request => request.user.toString() === req.user.id && request.status === "pending"
    );
    if (existingRequest) {
      return res.status(400).json({ message: "You already have a pending request to join this circle" });
    }

    circle.joinRequests.push({
      user: req.user.id,
      status: "pending",
    });

    await circle.save();
    await circle.populate("joinRequests.user", "name email");

    res.json({
      message: "Join request sent successfully. Waiting for admin approval.",
      circle,
    });
  } catch (error) {
    console.error("Error requesting to join circle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getJoinRequests = async (req, res) => {
  try {
    const circle = await FamilyCircle.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("joinRequests.user", "name email");

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const isAdmin = circle.members.some(
      member => member.user.toString() === req.user.id && member.role === "admin"
    ) || circle.createdBy.toString() === req.user.id;

    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can view join requests" });
    }

    const pendingRequests = circle.joinRequests.filter(
      request => request.status === "pending"
    );

    res.json({
      pendingRequests,
      total: pendingRequests.length,
    });
  } catch (error) {
    console.error("Error fetching join requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.processJoinRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body;
    const circleId = req.params.id;

    if (!requestId || !action) {
      return res.status(400).json({ message: "Request ID and action are required" });
    }

    const circle = await FamilyCircle.findOne({
      _id: circleId,
      isActive: true,
    });

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const isAdmin = circle.members.some(
      member => member.user.toString() === req.user.id && member.role === "admin"
    ) || circle.createdBy.toString() === req.user.id;

    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can process join requests" });
    }

    const requestIndex = circle.joinRequests.findIndex(
      request => request._id.toString() === requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: "Join request not found" });
    }

    const joinRequest = circle.joinRequests[requestIndex];

    if (action === "approve") {
      circle.members.push({
        user: joinRequest.user,
        role: "viewer",
        addedBy: req.user.id,
      });

      circle.joinRequests[requestIndex].status = "approved";
      circle.joinRequests[requestIndex].processedAt = new Date();
      circle.joinRequests[requestIndex].processedBy = req.user.id;
    } else if (action === "reject") {
      circle.joinRequests[requestIndex].status = "rejected";
      circle.joinRequests[requestIndex].processedAt = new Date();
      circle.joinRequests[requestIndex].processedBy = req.user.id;
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await circle.save();
    await circle.populate("members.user", "name email");
    await circle.populate("joinRequests.user", "name email");

    res.json({
      message: `Join request ${action}d successfully`,
      circle,
    });
  } catch (error) {
    console.error("Error processing join request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { usernameOrEmail, role = "viewer" } = req.body;
    const circleId = req.params.id;

    if (!usernameOrEmail) {
      return res.status(400).json({ message: "Username or email is required" });
    }

    const userToAdd = await User.findOne({
      $or: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ]
    });

    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }

    const circle = await FamilyCircle.findOne({
      _id: circleId,
      isActive: true,
    });

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const isAdmin = circle.members.some(
      member => member.user.toString() === req.user.id && member.role === "admin"
    ) || circle.createdBy.toString() === req.user.id;

    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    const isAlreadyMember = circle.members.some(
      member => member.user.toString() === userToAdd._id.toString()
    );
    if (isAlreadyMember) {
      return res.status(400).json({ message: "User is already a member of this circle" });
    }

    circle.members.push({
      user: userToAdd._id,
      role: role,
      addedBy: req.user.id,
    });

    await circle.save();
    await circle.populate("members.user", "name email username");

    res.json({
      message: "Member added successfully",
      circle,
    });
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.makeAdmin = async (req, res) => {
  try {
    const { memberId } = req.body;
    const circleId = req.params.id;

    if (!memberId) {
      return res.status(400).json({ message: "Member ID is required" });
    }

    const circle = await FamilyCircle.findOne({
      _id: circleId,
      isActive: true,
    });

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    if (circle.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the circle creator can assign admin roles" });
    }

    const memberIndex = circle.members.findIndex(
      member => member._id.toString() === memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found in circle" });
    }

    circle.members[memberIndex].role = "admin";

    await circle.save();
    await circle.populate("members.user", "name email");

    res.json({
      message: "Member promoted to admin successfully",
      circle,
    });
  } catch (error) {
    console.error("Error making member admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.removeAdmin = async (req, res) => {
  try {
    const { memberId } = req.body;
    const circleId = req.params.id;

    if (!memberId) {
      return res.status(400).json({ message: "Member ID is required" });
    }

    const circle = await FamilyCircle.findOne({
      _id: circleId,
      isActive: true,
    });

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    if (circle.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the circle creator can remove admin roles" });
    }

    const memberIndex = circle.members.findIndex(
      member => member._id.toString() === memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found in circle" });
    }

    if (circle.members[memberIndex].user.toString() === circle.createdBy.toString()) {
      return res.status(400).json({ message: "Cannot remove admin role from circle creator" });
    }

    const adminCount = circle.members.filter(member => member.role === "admin").length;
    if (adminCount <= 1) {
      return res.status(400).json({ message: "Cannot remove the only admin. Assign another admin first." });
    }

    circle.members[memberIndex].role = "contributor";

    await circle.save();
    await circle.populate("members.user", "name email");

    res.json({
      message: "Admin role removed successfully",
      circle,
    });
  } catch (error) {
    console.error("Error removing admin role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    const circleId = req.params.id;

    if (!memberId) {
      return res.status(400).json({ message: "Member ID is required" });
    }

    const circle = await FamilyCircle.findOne({
      _id: circleId,
      isActive: true,
    });

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const isAdmin = circle.members.some(
      member => member.user.toString() === req.user.id && member.role === "admin"
    ) || circle.createdBy.toString() === req.user.id;

    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    const targetMember = circle.members.find(
      member => member._id.toString() === memberId
    );

    if (targetMember && targetMember.user.toString() === req.user.id) {
      return res.status(400).json({ message: "Cannot remove yourself. Use the leave circle option instead." });
    }

    if (targetMember && targetMember.role === "admin") {
      const adminCount = circle.members.filter(member => member.role === "admin").length;
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Cannot remove the only admin" });
      }
    }

    circle.members = circle.members.filter(
      member => member._id.toString() !== memberId
    );

    await circle.save();
    await circle.populate("members.user", "name email");

    res.json({
      message: "Member removed successfully",
      circle,
    });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.leaveCircle = async (req, res) => {
  try {
    const circleId = req.params.id;

    const circle = await FamilyCircle.findOne({
      _id: circleId,
      isActive: true,
    });

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    if (circle.createdBy.toString() === req.user.id) {
      return res.status(400).json({ 
        message: "Creator cannot leave the circle. Transfer ownership or delete the circle instead." 
      });
    }

    const memberIndex = circle.members.findIndex(
      member => member.user.toString() === req.user.id
    );

    if (memberIndex === -1) {
      return res.status(400).json({ message: "You are not a member of this circle" });
    }

    const member = circle.members[memberIndex];
    if (member.role === "admin") {
      const adminCount = circle.members.filter(m => m.role === "admin").length;
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: "Cannot leave as the only admin. Assign another admin first." 
        });
      }
    }

    circle.members.splice(memberIndex, 1);
    await circle.save();

    res.json({
      message: "Successfully left the circle"
    });
  } catch (error) {
    console.error("Error leaving circle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteCircle = async (req, res) => {
  try {
    const circleId = req.params.id;

    const circle = await FamilyCircle.findOne({
      _id: circleId,
      createdBy: req.user.id
    });

    if (!circle) {
      return res.status(404).json({ message: "Circle not found or you are not the creator" });
    }

    circle.isActive = false;
    await circle.save();

    res.json({
      message: "Circle deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting circle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const { memberId, newRole } = req.body;
    const circleId = req.params.id;

    if (!memberId || !newRole) {
      return res.status(400).json({ message: "Member ID and new role are required" });
    }

    const circle = await FamilyCircle.findOne({
      _id: circleId,
      isActive: true,
    });

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const isAdmin = circle.members.some(
      member => member.user.toString() === req.user.id && member.role === "admin"
    ) || circle.createdBy.toString() === req.user.id;

    if (!isAdmin) {
      return res.status(403).json({ message: "Only admins can update roles" });
    }

    if (memberId === circle.createdBy.toString()) {
      return res.status(400).json({ message: "Cannot change the role of the circle creator" });
    }

    const memberIndex = circle.members.findIndex(
      member => member._id.toString() === memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: "Member not found in circle" });
    }

    circle.members[memberIndex].role = newRole;
    await circle.save();
    await circle.populate("members.user", "name email");

    res.json({
      message: "Member role updated successfully",
      circle,
    });
  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAdminPendingRequests = async (req, res) => {
  try {
    const circles = await FamilyCircle.find({
      $or: [
        { createdBy: req.user.id },
        { "members.user": req.user.id, "members.role": "admin" }
      ],
      isActive: true
    })
    .populate("createdBy", "name email")
    .populate("joinRequests.user", "name email")
    .select("name joinRequests createdBy members");

    const pendingRequests = [];
    
    circles.forEach(circle => {
      if (circle.joinRequests && circle.joinRequests.length > 0) {
        const circlePendingRequests = circle.joinRequests.filter(
          request => request.status === "pending"
        );
        
        circlePendingRequests.forEach(request => {
          pendingRequests.push({
            _id: request._id,
            user: request.user,
            circle: {
              _id: circle._id,
              name: circle.name,
              createdBy: circle.createdBy
            },
            requestedAt: request.requestedAt,
            circleId: circle._id
          });
        });
      }
    });

    res.json({
      pendingRequests,
      total: pendingRequests.length
    });
  } catch (error) {
    console.error("Error fetching admin pending requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.cancelJoinRequest = async (req, res) => {
  try {
    const { circleId } = req.body;

    if (!circleId) {
      return res.status(400).json({ message: "Circle ID is required" });
    }

    const circle = await FamilyCircle.findOne({
      _id: circleId,
      isActive: true
    });

    if (!circle) {
      return res.status(404).json({ message: "Circle not found" });
    }

    const requestIndex = circle.joinRequests.findIndex(
      request => request.user.toString() === req.user.id && request.status === "pending"
    );

    if (requestIndex === -1) {
      return res.status(404).json({ message: "No pending join request found" });
    }

    circle.joinRequests.splice(requestIndex, 1);
    await circle.save();

    res.json({
      message: "Join request cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling join request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUserPendingRequests = async (req, res) => {
  try {
    const requestedCircles = await FamilyCircle.find({
      "joinRequests.user": req.user.id,
      "joinRequests.status": "pending",
      isActive: true
    })
    .populate("createdBy", "name email")
    .populate("members.user", "name email")
    .select("name description createdBy joinRequests");

    const userPendingRequests = requestedCircles.map(circle => {
      const userRequest = circle.joinRequests.find(
        request => request.user.toString() === req.user.id && request.status === "pending"
      );
      
      return {
        circle: {
          _id: circle._id,
          name: circle.name,
          description: circle.description,
          createdBy: circle.createdBy,
          memberCount: circle.members.length + 1
        },
        request: userRequest,
        requestedAt: userRequest.requestedAt
      };
    });

    res.json({
      pendingRequests: userPendingRequests,
      total: userPendingRequests.length
    });
  } catch (error) {
    console.error("Error fetching user pending requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Getting all family circles where the user is a member
exports.getUserFamilyCircles = async (req, res) => {
  try {
    const userId = req.user.id;

    // Finding  circles where the user is a member or he created it
    const circles = await FamilyCircle.find({
      isActive: true,
      $or: [
        { createdBy: userId },
        { "members.user": userId }
      ],
    }).select("_id name description");

    res.json(circles);
  } catch (error) {
    console.error("Error fetching user family circles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};