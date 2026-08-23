const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || "15m",
    }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || "7d",
    }
  );

  return { accessToken, refreshToken };
};

const getCookieOptions = (maxAge, httpOnly = true) => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge,
  };
};

const setAuthCookies = (res, accessToken, refreshToken, userData) => {
  res.cookie(
    "accessToken",
    accessToken,
    getCookieOptions(ACCESS_COOKIE_MAX_AGE, true)
  );

  res.cookie(
    "refreshToken",
    refreshToken,
    getCookieOptions(REFRESH_COOKIE_MAX_AGE, true)
  );

  res.cookie(
    "user",
    JSON.stringify(userData),
    getCookieOptions(REFRESH_COOKIE_MAX_AGE, false)
  );
};

const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername },
      ],
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }

      if (existingUser.username === normalizedUsername) {
        return res.status(400).json({
          message: "Username already exists",
        });
      }
    }

    const newUser = new User({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password,
    });

    await newUser.save();

    const { accessToken, refreshToken } = generateTokens(newUser._id);

    newUser.refreshToken = refreshToken;
    await newUser.save();

    const userData = {
      id: newUser._id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
    };

    setAuthCookies(
      res,
      accessToken,
      refreshToken,
      userData
    );

    return res.status(201).json({
      message: "Registration successful",
      user: userData,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Username/email and password are required",
      });
    }

    const normalizedIdentifier = identifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier },
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

    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    const userData = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
    };

    setAuthCookies(
      res,
      accessToken,
      refreshToken,
      userData
    );

    return res.status(200).json({
      message: "Login successful",
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

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

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || "15m",
      }
    );

    res.cookie(
      "accessToken",
      accessToken,
      getCookieOptions(ACCESS_COOKIE_MAX_AGE, true)
    );

    return res.status(200).json({
      message: "Access token refreshed",
    });
  } catch (error) {
    console.error("Token refresh error:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(403).json({
        message: "Invalid or expired refresh token",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const googleCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL;

  try {
    if (!frontendUrl) {
      console.error("FRONTEND_URL is not configured");

      return res.status(500).json({
        message: "Frontend URL is not configured",
      });
    }

    const user = req.user;

    if (!user) {
      const errorMessage =
        req.authInfo?.message || "Authentication failed";

      if (errorMessage.includes("Please login instead")) {
        return res.redirect(
          `${frontendUrl}/login?error=${encodeURIComponent(
            "Account already exists. Please login instead."
          )}`
        );
      }

      if (errorMessage.includes("Please register first")) {
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

    const { accessToken, refreshToken } =
      generateTokens(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    const userData = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
    };

    setAuthCookies(
      res,
      accessToken,
      refreshToken,
      userData
    );

    return res.redirect(`${frontendUrl}/profile`);
  } catch (error) {
    console.error("Google authentication error:", error);

    if (!frontendUrl) {
      return res.status(500).json({
        message: "Authentication failed",
      });
    }

    return res.redirect(
      `${frontendUrl}/login?error=${encodeURIComponent(
        "Server error during authentication."
      )}`
    );
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken);

        if (decoded?.id) {
          await User.findByIdAndUpdate(
            decoded.id,
            { refreshToken: null }
          );
        }
      } catch (error) {
        console.error("Error decoding refresh token:", error);
      }
    }

    const isProduction =
      process.env.NODE_ENV === "production";

    const authCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    };

    const userCookieOptions = {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    };

    res.clearCookie(
      "accessToken",
      authCookieOptions
    );

    res.clearCookie(
      "refreshToken",
      authCookieOptions
    );

    res.clearCookie(
      "user",
      userCookieOptions
    );

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  googleCallback,
  logout,
};