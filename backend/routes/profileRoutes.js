const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  getProfile,
  updateProfile,
  updatePassword
} = require('../controllers/profileController');

const router = express.Router();

router.get('/', authenticateToken, getProfile);
router.put('/', authenticateToken, updateProfile);
router.put('/password', authenticateToken, updatePassword);

module.exports = router;