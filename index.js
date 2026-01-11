const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;



app.use(cors());
app.use(express.json());







const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u8prwai.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    // all collaction
    const eTutionCollaction = client.db("etutionDB").collection("tutions")






app.post("/tutions", async( req, res) => {
  const newTutions = req.body
  const result  = await eTutionCollaction.insertOne(newTutions)
  res.send(result)
})


app.get("/tutions", async( req, res) => {
  
  const result  = await eTutionCollaction.find().toArray()
  res.send(result)
})

app.get("/tutions-latest", async (req, res) => {
  try {
    // .sort({ _id: -1 }) দিয়ে লেটেস্ট ডাটা এবং .limit(3) দিয়ে প্রথম ৩টি ডাটা নেওয়া হয়েছে
    const result = await eTutionCollaction
      .find()
      .sort({ _id: -1 })
      .limit(4)
      .toArray();
    
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Error fetching data", error });
  }
});


app.get("/tutions-details/:id", async( req, res) => {
  const email = req.params.id
  const queary = {_id: new ObjectId(email)}
  const result  = await eTutionCollaction.findOne(queary)
  res.send(result)
})


app.get("/my-tutions/:email", async( req, res) => {
  const email = req.params.email
  const queary = {email}
  const result  = await eTutionCollaction.find().toArray(queary)
  res.send(result)
})
app.delete("/tutionsDelete/:id", async( req, res) => {
  const id = req.params.id
  const queary = {_id: new ObjectId(id)}
  const result  = await eTutionCollaction.deleteOne(queary)
  res.send(result)
})

// Update Tuition API
app.put("/tutionsUpdate/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      subject: req.body.subject,
      class: req.body.class,
      tuitionType: req.body.tuitionType,
      salary: req.body.salary,
      daysPerWeek: req.body.daysPerWeek,
      location: req.body.location,
      description: req.body.description,
    },
  };
  const result = await eTutionCollaction.updateOne(filter, updatedDoc);
  res.send(result);
});















    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






















app.get('/', (req, res) => {
  res.send('eTuitionBd Server is Running Successfully');
});

app.listen(port, () => {
  console.log(`eTuitionBd server is running on port ${port}`);
});
