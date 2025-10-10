const express = require('express');
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  getProfile,
  updateProfile,
  updatePassword,
  updateBirthYear,
} = require('../controllers/profileController');

const router = express.Router();

router.get('/', authenticateToken, getProfile);
router.put('/', authenticateToken, updateProfile);
router.put('/password', authenticateToken, updatePassword);

router.put('/birthyear', authenticateToken, updateBirthYear);

module.exports = router;
