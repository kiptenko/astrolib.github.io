// Login Required middleware.
export const findAuthentication = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  res.status(500).json({ error: { message: 'Not authenticated.' } });
};