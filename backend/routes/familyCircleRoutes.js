const express = require("express");
const router = express.Router();
const familyCircleController = require("../controllers/familyCircleController");
const { authenticateToken } = require("../middlewares/authMiddleware");


router.use(authenticateToken);



// Fetch current user's family circles
router.get("/my", familyCircleController.getUserFamilyCircles);

// Create a new family circle
router.post("/create", familyCircleController.createFamilyCircle);

// Get all circles the user is part of
router.get("/my-circles", familyCircleController.getUserCircles);

// Join request routes
router.post("/request-join", familyCircleController.requestToJoin);
router.get("/:id/join-requests", familyCircleController.getJoinRequests);
router.post("/:id/process-request", familyCircleController.processJoinRequest);

// Member management
router.post("/:id/add-member", familyCircleController.addMember);
router.post("/:id/make-admin", familyCircleController.makeAdmin);
router.post("/:id/remove-admin", familyCircleController.removeAdmin);
router.delete("/:id/member", familyCircleController.removeMember);
router.put("/:id/member-role", familyCircleController.updateMemberRole);

// Pending requests
router.get("/admin/pending-requests", familyCircleController.getAdminPendingRequests);
router.get("/user/pending-requests", familyCircleController.getUserPendingRequests);
router.post("/cancel-request", familyCircleController.cancelJoinRequest);

// Leave or delete a circle
router.post("/:id/leave", familyCircleController.leaveCircle);
router.delete("/:id", familyCircleController.deleteCircle);

// Finally, get circle by ID (must come LAST)
router.get("/:id", familyCircleController.getCircleById);



module.exports = router;
