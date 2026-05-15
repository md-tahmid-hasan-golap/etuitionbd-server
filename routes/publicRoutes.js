const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

/**
 * Public Routes
 * Handles user registration and role fetching
 */
module.exports = (usersCollection, tuitionsCollection, tutorsCollection) => {
  
  // GET /all-tuitions - Advanced search, filtering, sorting, and pagination
  router.get("/all-tuitions", async (req, res) => {
    try {
      const { search, class: filterClass, subject, location, sort, page = 1, limit = 6 } = req.query;
      
      // 1. Build Query (Filtering & Search)
      let query = { status: "Approved" };

      if (search) {
        query.$or = [
          { subject: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } }
        ];
      }

      if (filterClass) {
        query.class = filterClass;
      }

      if (subject) {
        query.subject = subject;
      }

      if (location) {
        query.location = { $regex: location, $options: "i" };
      }

      // 2. Build Sort
      let sortObj = {};
      if (sort === "salary-asc") {
        sortObj.salary = 1;
      } else if (sort === "salary-desc") {
        sortObj.salary = -1;
      } else if (sort === "date-newest") {
        sortObj.createdAt = -1;
      } else {
        sortObj.createdAt = -1; // Default
      }

      // 3. Pagination Logic
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitCount = parseInt(limit);

      // 4. Execute Queries
      const totalCount = await tuitionsCollection.countDocuments(query);
      const tuitions = await tuitionsCollection
        .find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitCount)
        .toArray();

      res.send({
        totalCount,
        tuitions
      });
    } catch (error) {
      console.error("Error fetching tuitions:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // POST /users - Register a new user
  router.post("/users", async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    
    try {
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      const newUser = {
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        role: user.role || "Student",
        phone: user.phone || "",
        createdAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    } catch (error) {
      console.error("Error inserting user:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /user/role/:email - Fetch user role by email
  router.get("/user/role/:email", async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    
    try {
      const user = await usersCollection.findOne(query, {
        projection: { role: 1, _id: 0 },
      });
      
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      
      res.send(user);
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /user/:email - Fetch full user profile
  router.get("/user/:email", async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    try {
      const user = await usersCollection.findOne(query);
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }
      res.send(user);
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // PATCH /user/:email - Update user profile details
  router.patch("/user/:email", async (req, res) => {
    const email = req.params.email;
    const filter = { email: email };
    const updatedDoc = {
      $set: {
        ...req.body, // This allows updating phone, qualifications, bio, etc.
      },
    };
    try {
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /tuition/:id - Fetch a single tuition by ID
  router.get("/tuition/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tuitionsCollection.findOne(query);
      if (!result) {
        return res.status(404).send({ message: "Tuition not found" });
      }
      res.send(result);
    } catch (error) {
      console.error("Error fetching tuition details:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // GET /tutors - Fetch tutors with dynamic sorting and limiting
  router.get("/tutors", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const sortOrder = req.query.sort === 'asc' ? 1 : -1;

      const tutors = await tutorsCollection
        .find({})
        .sort({ _id: sortOrder })
        .limit(limit)
        .toArray();
      res.send(tutors);
    } catch (error) {
      console.error("Error fetching tutors:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  // DEV ONLY: Approve all pending tuitions
  router.patch("/dev/approve-all", async (req, res) => {
    try {
      const result = await tuitionsCollection.updateMany(
        { status: "Pending" },
        { $set: { status: "Approved" } }
      );
      res.send(result);
    } catch (error) {
      console.error("Error approving tuitions:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  return router;
};
