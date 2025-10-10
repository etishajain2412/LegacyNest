const express = require("express");
const router = express.Router();
const familyCircleController = require("../controllers/familyCircleController");
const { authenticateToken } = require("../middlewares/authMiddleware");




router.use(authenticateToken);

// Create circle
router.post("/create", familyCircleController.createFamilyCircle);

router.get("/my", authenticateToken, familyCircleController.getUserFamilyCircles);

// Get user's circles
router.get("/my-circles", familyCircleController.getUserCircles);

// Get circle by ID
router.get("/:id", familyCircleController.getCircleById);

// Delete circle (creator only)
router.delete("/:id", familyCircleController.deleteCircle);

// Leave circle
router.post("/:id/leave", familyCircleController.leaveCircle);

// Join request routes
router.post("/request-join", familyCircleController.requestToJoin);
router.get("/:id/join-requests", familyCircleController.getJoinRequests);
router.post("/:id/process-request", familyCircleController.processJoinRequest);

// Member management routes
router.post("/:id/add-member", familyCircleController.addMember);
router.post("/:id/make-admin", familyCircleController.makeAdmin);
router.post("/:id/remove-admin", familyCircleController.removeAdmin);
router.delete("/:id/member", familyCircleController.removeMember);
router.put("/:id/member-role", familyCircleController.updateMemberRole);

// Pending request management routes
router.get("/admin/pending-requests", familyCircleController.getAdminPendingRequests);
router.get("/user/pending-requests", familyCircleController.getUserPendingRequests);
router.post("/cancel-request", familyCircleController.cancelJoinRequest);

router.get("/my", authenticateToken, familyCircleController.getUserFamilyCircles);

module.exports = router;