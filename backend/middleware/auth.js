const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get token from header
  let token = req.header('Authorization');

  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7, token.length).trimLeft();
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ detail: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7'
    );
    req.user = decoded.sub; // The payload sub is the username
    next();
  } catch (err) {
    res.status(401).json({ detail: 'Token is not valid' });
  }
};
