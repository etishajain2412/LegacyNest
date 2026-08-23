const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

// =====================================================
// TOKEN GENERATION
// =====================================================

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "7d",
    }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );

  return {
    accessToken,
    refreshToken,
  };
};


// =====================================================
// COOKIE OPTIONS
// =====================================================

const getCookieOptions = (maxAge, httpOnly = true) => {
  const isProduction =
    process.env.NODE_ENV === "production";

  return {
    httpOnly,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
  };
};


// =====================================================
// REGISTER
// =====================================================

const register = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      password,
    } = req.body;

    if (
      !name ||
      !username ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email },
        { username },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }

      if (existingUser.username === username) {
        return res.status(400).json({
          message: "Username already exists",
        });
      }
    }

    const newUser = new User({
      name,
      username,
      email,
      password,
    });

    await newUser.save();

    const {
      accessToken,
      refreshToken,
    } = generateTokens(newUser._id);

    await User.findByIdAndUpdate(
      newUser._id,
      {
        refreshToken,
      }
    );

    // Access token cookie - 7 days
    res.cookie(
      "accessToken",
      accessToken,
      getCookieOptions(
        7 * 24 * 60 * 60 * 1000,
        true
      )
    );

    // Refresh token cookie - 7 days
    res.cookie(
      "refreshToken",
      refreshToken,
      getCookieOptions(
        7 * 24 * 60 * 60 * 1000,
        true
      )
    );

    const userData = {
      id: newUser._id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
    };

    // User cookie - 7 days
    res.cookie(
      "user",
      JSON.stringify(userData),
      getCookieOptions(
        7 * 24 * 60 * 60 * 1000,
        false
      )
    );

    return res.status(201).json({
      message: "Registration successful",
      user: userData,
    });

  } catch (error) {
    console.error(
      "Error during registration:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {
  try {
    const {
      identifier,
      password,
    } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
      ],
    });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "Please use Google to login",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const {
      accessToken,
      refreshToken,
    } = generateTokens(user._id);

    await User.findByIdAndUpdate(
      user._id,
      {
        refreshToken,
      }
    );

    // Access token - 7 days
    res.cookie(
      "accessToken",
      accessToken,
      getCookieOptions(
        7 * 24 * 60 * 60 * 1000,
        true
      )
    );

    // Refresh token - 7 days
    res.cookie(
      "refreshToken",
      refreshToken,
      getCookieOptions(
        7 * 24 * 60 * 60 * 1000,
        true
      )
    );

    const userData = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
    };

    // User cookie - 7 days
    res.cookie(
      "user",
      JSON.stringify(userData),
      getCookieOptions(
        7 * 24 * 60 * 60 * 1000,
        false
      )
    );

    // IMPORTANT:
    // Normal Axios login must return JSON.
    // Do NOT redirect here.
    return res.status(200).json({
      message: "Login successful",
      user: userData,
    });

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// =====================================================
// REFRESH ACCESS TOKEN
// =====================================================

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken =
      req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token required",
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findOne({
      _id: decoded.id,
      refreshToken,
    });

    if (!user) {
      return res.status(403).json({
        message: "Invalid refresh token",
      });
    }

    // Generate new access token - 7 days
    const accessToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // New access token cookie - 7 days
    res.cookie(
      "accessToken",
      accessToken,
      getCookieOptions(
        7 * 24 * 60 * 60 * 1000,
        true
      )
    );

    return res.status(200).json({
      message: "Access token refreshed",
    });

  } catch (error) {
    console.error(
      "Token refresh error:",
      error
    );

    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      return res.status(403).json({
        message: "Invalid refresh token",
      });
    }

    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res.status(403).json({
        message: "Refresh token expired",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// =====================================================
// GOOGLE CALLBACK
// =====================================================

const googleCallback = async (req, res) => {
  try {
    const user = req.user;

    const isProduction =
      process.env.NODE_ENV === "production";

    const frontendUrl = isProduction
      ? process.env.FRONTEND_URL_PROD
      : process.env.FRONTEND_URL_DEV ||
        "http://localhost:3000";

    // Google authentication failed
    if (!user) {
      const errorMessage =
        req.authInfo?.message ||
        "Authentication failed";

      if (
        errorMessage.includes(
          "Please login instead"
        )
      ) {
        return res.redirect(
          `${frontendUrl}/login?error=${encodeURIComponent(
            "Account already exists. Please login instead."
          )}`
        );
      }

      if (
        errorMessage.includes(
          "Please register first"
        )
      ) {
        return res.redirect(
          `${frontendUrl}/register?error=${encodeURIComponent(
            "No account found. Please register first."
          )}`
        );
      }

      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(
          errorMessage
        )}`
      );
    }

    const {
      accessToken,
      refreshToken,
    } = generateTokens(user._id);

    await User.findByIdAndUpdate(
      user._id,
      {
        refreshToken,
      }
    );

    // Access token - 7 days
    res.cookie(
      "accessToken",
      accessToken,
      getCookieOptions(
        7 * 24 * 60 * 60 * 1000,
        true
      )
    );

    // Refresh token - 7 days
    res.cookie(
      "refreshToken",
      refreshToken,
      getCookieOptions(
        7 * 24 * 60 * 60 * 1000,
        true
      )
    );

    const userData = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
    };

    // User cookie - 7 days
    res.cookie(
      "user",
      JSON.stringify(userData),
      getCookieOptions(
        7 * 24 * 60 * 60 * 1000,
        false
      )
    );

    // Google OAuth is a browser redirect,
    // so redirect is correct here.
    return res.redirect(
      `${frontendUrl}/profile`
    );

  } catch (error) {
    console.error(
      "Google authentication error:",
      error
    );

    const isProduction =
      process.env.NODE_ENV === "production";

    const frontendUrl = isProduction
      ? process.env.FRONTEND_URL_PROD
      : process.env.FRONTEND_URL_DEV ||
        "http://localhost:3000";

    return res.redirect(
      `${frontendUrl}/login?error=${encodeURIComponent(
        "Server error during authentication."
      )}`
    );
  }
};


// =====================================================
// LOGOUT
// =====================================================

const logout = async (req, res) => {
  try {
    const refreshToken =
      req.cookies.refreshToken;

    if (refreshToken) {
      const decoded =
        jwt.decode(refreshToken);

      if (decoded?.id) {
        await User.findByIdAndUpdate(
          decoded.id,
          {
            refreshToken: null,
          }
        );
      }
    }

    const isProduction =
      process.env.NODE_ENV === "production";

    const clearCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction
        ? "none"
        : "lax",
    };

    res.clearCookie(
      "accessToken",
      clearCookieOptions
    );

    res.clearCookie(
      "refreshToken",
      clearCookieOptions
    );

    res.clearCookie(
      "user",
      {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction
          ? "none"
          : "lax",
      }
    );

    return res.status(200).json({
      message: "Logged out successfully",
    });

  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  register,
  login,
  refreshAccessToken,
  googleCallback,
  logout,
};