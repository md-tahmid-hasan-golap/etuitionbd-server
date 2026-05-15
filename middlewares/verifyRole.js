/**
 * Higher-order function to verify user role from the database
 * @param {string} requiredRole - The role required to access the route
 * @param {object} usersCollection - The MongoDB users collection
 */
const verifyRole = (requiredRole, usersCollection) => {
  return async (req, res, next) => {
    const email = req.user?.email;
    
    if (!email) {
      return res.status(401).send({ message: "Unauthorized access: No email found in token" });
    }

    try {
      const user = await usersCollection.findOne({ email: email });
      
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      if (user.role?.toLowerCase() !== requiredRole?.toLowerCase()) {
        return res.status(403).send({ message: "Forbidden: You do not have the required role" });
      }

      next();
    } catch (error) {
      console.error("Error verifying role:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  };
};

module.exports = verifyRole;
