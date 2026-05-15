const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

/**
 * Tutor Routes
 * Handles tuition applications, ongoing tuitions, and revenue tracking
 */
module.exports = (tuitionsCollection, applicationsCollection, paymentsCollection, tutorsCollection) => {
  // GET /available-tuitions - Fetch all tuitions where status is 'Approved'
  router.get("/available-tuitions", async (req, res) => {
    try {
      const query = { status: "Approved" };
      const result = await tuitionsCollection.find(query).toArray();
      res.send(result);
    } catch (error) {
      console.error("Error fetching available tuitions:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // POST /apply - Submit a tuition application
  router.post("/apply", async (req, res) => {
    const application = req.body;
    try {
      const newApplication = {
        tuitionId: new ObjectId(application.tuitionId),
        tuitionSubject: application.tuitionSubject,
        studentEmail: application.studentEmail,
        tutorName: application.tutorName,
        tutorEmail: application.tutorEmail,
        qualifications: application.qualifications,
        experience: application.experience,
        expectedSalary: application.expectedSalary,
        status: "Pending", // Default status
        appliedAt: new Date(),
      };
      const result = await applicationsCollection.insertOne(newApplication);
      res.send(result);
    } catch (error) {
      console.error("Error submitting application:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /my-applications/:email - Fetch all applications made by a specific tutor
  router.get("/my-applications/:email", async (req, res) => {
    const email = req.params.email;
    try {
      const query = { tutorEmail: email };
      const result = await applicationsCollection.find(query).toArray();
      res.send(result);
    } catch (error) {
      console.error("Error fetching my applications:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /ongoing-tuitions/:email - Fetch applications where status is 'Accepted' (Paid)
  router.get("/ongoing-tuitions/:email", async (req, res) => {
    const email = req.params.email;
    try {
      const query = { tutorEmail: email, status: "Accepted" };
      const result = await applicationsCollection.find(query).toArray();
      res.send(result);
    } catch (error) {
      console.error("Error fetching ongoing tuitions:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /revenue/:email - Fetch all individual payment records for a tutor
  router.get("/revenue/:email", async (req, res) => {
    const email = req.params.email;
    try {
      const result = await paymentsCollection
        .find({ tutorEmail: email })
        .sort({ date: -1 })
        .toArray();
      // Normalize price to number in case it was stored as a string
      const normalized = result.map(p => ({
        ...p,
        price: parseFloat(p.price) || 0
      }));
      res.send(normalized);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /revenue-stats/:email - Aggregate total earnings for a tutor
  router.get("/revenue-stats/:email", async (req, res) => {
    const email = req.params.email;
    try {
      const pipeline = [
        // Step 1: Filter by tutorEmail
        { $match: { tutorEmail: email } },
        // Step 2: Convert price to number (handles string-stored values)
        {
          $addFields: {
            priceAsNumber: { $toDouble: "$price" }
          }
        },
        // Step 3: Group and sum all payments
        {
          $group: {
            _id: "$tutorEmail",
            totalRevenue: { $sum: "$priceAsNumber" },
            totalTransactions: { $sum: 1 },
            lastPayment: { $max: "$date" }
          }
        }
      ];

      const result = await paymentsCollection.aggregate(pipeline).toArray();

      if (result.length === 0) {
        return res.send({ totalRevenue: 0, totalTransactions: 0, lastPayment: null });
      }

      res.send(result[0]);
    } catch (error) {
      console.error("Error aggregating revenue stats:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /profile/:email - Fetch tutor profile data
  router.get("/profile/:email", async (req, res) => {
    const email = req.params.email;
    try {
      const query = { email: email };
      const result = await tutorsCollection.findOne(query);
      if (!result) {
        return res.status(404).send({ message: "Tutor profile not found" });
      }
      res.send(result);
    } catch (error) {
      console.error("Error fetching tutor profile:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // DELETE /application/:id - Remove a pending application
  router.delete("/application/:id", async (req, res) => {
    const id = req.params.id;
    try {
      const query = { _id: new ObjectId(id), status: "Pending" };
      const result = await applicationsCollection.deleteOne(query);
      if (result.deletedCount === 0) {
        return res.status(400).send({ message: "Cannot delete non-pending application" });
      }
      res.send(result);
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // PATCH /application/edit/:id - Edit salary/experience for pending application
  router.patch("/application/edit/:id", async (req, res) => {
    const id = req.params.id;
    const { expectedSalary, experience } = req.body;
    try {
      const filter = { _id: new ObjectId(id), status: "Pending" };
      const updateDoc = {
        $set: {
          expectedSalary: expectedSalary,
          experience: experience
        }
      };
      const result = await applicationsCollection.updateOne(filter, updateDoc);
      if (result.matchedCount === 0) {
        return res.status(400).send({ message: "Cannot edit non-pending application" });
      }
      res.send(result);
    } catch (error) {
      console.error("Error editing application:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  return router;
};
