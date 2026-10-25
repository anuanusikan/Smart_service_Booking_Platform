function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Please log in to continue' });
    if (req.user.role !== role) return res.status(403).json({ message: `This action is available to ${role}s only` });
    next();
  };
}

module.exports = requireRole;
