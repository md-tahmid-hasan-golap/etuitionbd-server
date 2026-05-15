const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

module.exports = (
  usersCollection,
  tuitionsCollection,
  applicationsCollection,
  paymentsCollection,
) => {
  // --- ১. টিউশন পোস্ট করা (Create) ---
  // POST: /api/student/post-tuition
  router.post("/post-tuition", async (req, res) => {
    const tuitionData = req.body;
    const newPost = {
      ...tuitionData,
      status: "Pending", // ডিফল্ট স্ট্যাটাস পেন্ডিং থাকবে (এডমিন এপ্রুভালের জন্য)
      createdAt: new Date(),
    };
    const result = await tuitionsCollection.insertOne(newPost);
    res.send(result);
  });

  // --- ২. নিজের করা সব টিউশন দেখা (Read) ---
  // GET: /api/student/my-tuitions/:email
  router.get("/my-tuitions/:email", async (req, res) => {
    const email = req.params.email;
    const query = { studentEmail: email };
    const result = await tuitionsCollection.find(query).toArray();
    res.send(result);
  });

  // --- ৩. টিউশন পোস্ট আপডেট করা (Update) ---
  // PATCH: /api/student/update-tuition/:id
  router.patch("/update-tuition/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        subject: req.body.subject,
        class: req.body.class,
        location: req.body.location,
        budget: req.body.budget,
        daysPerWeek: req.body.daysPerWeek,
        // যা যা আপডেট করা দরকার সব এখানে আসবে
      },
    };
    const result = await tuitionsCollection.updateOne(filter, updatedDoc);
    res.send(result);
  });

  // --- ৪. টিউশন পোস্ট ডিলিট করা (Delete) ---
  // DELETE: /api/student/delete-tuition/:id
  router.delete("/delete-tuition/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await tuitionsCollection.deleteOne(query);
    res.send(result);
  });

  // --- ৫. নির্দিষ্ট টিউশনে কতজন টিউটর অ্যাপ্লাই করেছে তা দেখা ---
  // GET: /api/student/applied-tutors/:tuitionId
  router.get("/applied-tutors/:tuitionId", async (req, res) => {
    const tuitionId = req.params.tuitionId;
    const query = { 
      $or: [
        { tuitionId: tuitionId },
        { tuitionId: new ObjectId(tuitionId) }
      ]
      // No status filter — show all applications (Pending, Approved, Accepted, Rejected)
    };
    const result = await applicationsCollection.find(query).toArray();
    res.send(result);
  });

  // --- 5.1 নির্দিষ্ট স্টুডেন্টের সব অ্যাপলিকেশন দেখা ---
  // GET: /api/student/applications/student/:email
  router.get("/applications/student/:email", async (req, res) => {
    const email = req.params.email;
    const query = { 
      studentEmail: email
      // No status filter — show all applications so student can manage them
    };
    const result = await applicationsCollection.find(query).toArray();
    res.send(result);
  });

  // --- ৬. টিউটর রিজেক্ট করা ---
  // PATCH: /api/student/reject-tutor/:applicationId
  router.patch("/reject-tutor/:applicationId", async (req, res) => {
    const id = req.params.applicationId;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { status: "Rejected" } };
    const result = await applicationsCollection.updateOne(filter, updateDoc);
    res.send(result);
  });

  // Alias for reject-tutor
  router.patch("/application/reject/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { status: "Rejected" } };
    const result = await applicationsCollection.updateOne(filter, updateDoc);
    res.send(result);
  });

  // GET: /api/student/payments/:email
  router.get("/payments/:email", async (req, res) => {
    const email = req.params.email;
    // Search by both studentEmail and email for backward compatibility and robustness
    const query = { 
      $or: [
        { studentEmail: email },
        { email: email }
      ]
    };
    const result = await paymentsCollection.find(query).toArray();
    res.send(result);
  });

  // --- 8. Profile Settings Update ---
  router.patch("/update-profile/:email", async (req, res) => {
    const email = req.params.email;
    const filter = { email: email };
    const updatedDoc = {
      $set: {
        name: req.body.name,
        photoUrl: req.body.photoUrl,
        phone: req.body.phone,
      },
    };
    const result = await usersCollection.updateOne(filter, updatedDoc);
    res.send(result);
  });

  // --- 9. Stripe Payment Intent ---
  router.post("/create-payment-intent", async (req, res) => {
    const { price } = req.body;
    if (!price) return res.status(400).send({ message: "Price is required" });

    try {
      // Convert price to cents as per user request
      const amount = parseInt(price * 100);
      
      const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
      if (!secretKey) {
        return res.status(500).send({ message: "Stripe Secret Key is missing in server environment" });
      }

      const stripe = require("stripe")(secretKey);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error("Stripe Backend Error:", error);
      res.status(500).send({ message: error.message });
    }
  });

  // --- 10. Save Payment Details ---
  router.post("/payments", async (req, res) => {
    const payment = req.body;
    const paymentResult = await paymentsCollection.insertOne(payment);
    res.send(paymentResult);
  });

  // --- 11. Update Application Status ---
  router.patch("/application-status/:id", async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: { status },
    };
    const result = await applicationsCollection.updateOne(filter, updatedDoc);
    res.send(result);
  });

  // --- 12. Update Tuition Status ---
  router.patch("/tuition-status/:id", async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: { status },
    };
    const result = await tuitionsCollection.updateOne(filter, updatedDoc);
    res.send(result);
  });

  // --- 13. Get Single Application ---
  router.get("/application/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await applicationsCollection.findOne(query);
    res.send(result);
  });

  return router;
};
