const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid access token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Access token expired' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { authenticateToken };