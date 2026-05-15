const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

/**
 * Admin Routes
 * Handles user management, tuition moderation, and system statistics
 */
module.exports = (usersCollection, tuitionsCollection, paymentsCollection, applicationsCollection, tutorsCollection) => {

  // GET /all-applications - Fetch all tutor applications for moderation
  router.get("/all-applications", async (req, res) => {
    try {
      const result = await applicationsCollection.find().sort({ appliedAt: -1 }).toArray();
      res.send(result);
    } catch (error) {
      console.error("Error fetching all applications:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // PATCH /application/status/:id - Update application status (Approve/Reject)
  router.patch("/application/status/:id", async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    try {
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: status } };
      const result = await applicationsCollection.updateOne(filter, updateDoc);
      res.send(result);
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /all-users - Fetch all users for management
  router.get("/all-users", async (req, res) => {
    try {
      const result = await usersCollection.find().toArray();
      res.send(result);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // PATCH /user/role/:id - Update a user's role
  router.patch("/user/role/:id", async (req, res) => {
    const id = req.params.id;
    const { role } = req.body;
    try {
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: role } };
      const result = await usersCollection.updateOne(filter, updateDoc);

      // If role is updated to 'Tutor', ensure they exist in tutorsCollection
      if (role?.toLowerCase() === "tutor") {
        const user = await usersCollection.findOne(filter);
        if (user) {
          const existingTutor = await tutorsCollection.findOne({ email: user.email });
          if (!existingTutor) {
            const newTutor = {
              name: user.name,
              email: user.email,
              uid: user.uid || "",
              photo: user.photo || "",
              qualifications: "",
              bio: "",
              experience: "Fresh",
              status: "Pending",
              createdAt: new Date()
            };
            await tutorsCollection.insertOne(newTutor);
            // We still return the original result but can augment it if needed
            return res.send({ ...result, message: "User promoted and tutor profile created." });
          }
        }
      }

      res.send(result);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // PATCH /user/details/:id - Update user contact/verification details
  router.patch("/user/details/:id", async (req, res) => {
    const id = req.params.id;
    const { phone, isVerified, name, photoUrl, status } = req.body;
    try {
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { 
        $set: { 
          phone: phone,
          isVerified: isVerified,
          name: name,
          photoUrl: photoUrl,
          status: status || 'Active'
        } 
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    } catch (error) {
      console.error("Error updating user details:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // DELETE /user/:id - Remove a user account
  router.delete("/user/:id", async (req, res) => {
    const id = req.params.id;
    try {
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /pending-tuitions - Fetch all tuition posts with 'Pending' status
  router.get("/pending-tuitions", async (req, res) => {
    try {
      const query = { status: "Pending" };
      const result = await tuitionsCollection.find(query).toArray();
      res.send(result);
    } catch (error) {
      console.error("Error fetching pending tuitions:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /all-tuitions-admin - Fetch all tuitions for admin management
  router.get("/all-tuitions-admin", async (req, res) => {
    try {
      const result = await tuitionsCollection.find().sort({ createdAt: -1 }).toArray();
      res.send(result);
    } catch (error) {
      console.error("Error fetching all tuitions for admin:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // PATCH /tuition/approve/:id - Approve a tuition post
  router.patch("/tuition/approve/:id", async (req, res) => {
    const id = req.params.id;
    try {
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: "Approved" } };
      const result = await tuitionsCollection.updateOne(filter, updateDoc);
      res.send(result);
    } catch (error) {
      console.error("Error approving tuition:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // PATCH /tuition/reject/:id - Reject a tuition post
  router.patch("/tuition/reject/:id", async (req, res) => {
    const id = req.params.id;
    try {
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { status: "Rejected" } };
      const result = await tuitionsCollection.updateOne(filter, updateDoc);
      res.send(result);
    } catch (error) {
      console.error("Error rejecting tuition:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // DELETE /tuition/:id - Delete a tuition post
  router.delete("/tuition/:id", async (req, res) => {
    const id = req.params.id;
    try {
      const query = { _id: new ObjectId(id) };
      const result = await tuitionsCollection.deleteOne(query);
      res.send(result);
    } catch (error) {
      console.error("Error deleting tuition:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /admin-stats - System overview and revenue tracking for charts
  router.get("/admin-stats", async (req, res) => {
    try {
      // 1. User Role Distribution
      const users = await usersCollection.find({}, { projection: { role: 1 } }).toArray();
      const roleStats = users.reduce((acc, user) => {
        const role = user.role?.toLowerCase() || "student";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, { student: 0, tutor: 0, admin: 0 });

      const roleData = [
        { name: "Students", value: roleStats.student },
        { name: "Tutors", value: roleStats.tutor },
        { name: "Admins", value: roleStats.admin },
      ];

      // 2. Revenue over time (Trend)
      const payments = await paymentsCollection.find().toArray();
      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Group payments by date (YYYY-MM-DD)
      const revenueTrendMap = payments.reduce((acc, p) => {
        const date = p.date ? new Date(p.date).toISOString().split('T')[0] : "Unknown";
        acc[date] = (acc[date] || 0) + p.amount;
        return acc;
      }, {});

      const revenueTrend = Object.keys(revenueTrendMap).sort().map(date => ({
        date,
        amount: revenueTrendMap[date]
      }));

      // 3. Tuition Summary
      const totalTuitions = await tuitionsCollection.countDocuments();
      const approvedTuitions = await tuitionsCollection.countDocuments({ status: "Approved" });

      res.send({
        roleData,
        revenueTrend,
        stats: {
          totalRevenue,
          totalUsers: users.length,
          totalTuitions,
          approvedTuitions,
          studentCount: roleStats.student,
          tutorCount: roleStats.tutor
        }
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  return router;
};
