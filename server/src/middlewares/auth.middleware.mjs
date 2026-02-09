/**
 * @desc Auth guard middleware
 */
export const isAuth = (req, res, next) => {
  // Allow requests with an authenticated session.
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({
      success: false,
      message: "Login is required.",
    });
  }
};

/**
 * @desc Guest-only guard middleware
 */
export const isGuest = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    next();
  } else {
    res.status(400).json({
      success: false,
      message: "You are already logged in.",
    });
  }
};
