const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT token from Authorization header
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access: Missing token" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT Verify Error:", err.message);
      return res.status(401).send({ 
        message: "Unauthorized access: " + (err.name === 'TokenExpiredError' ? "Token Expired" : "Invalid Token"),
        error: err.message
      });
    }
    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;
