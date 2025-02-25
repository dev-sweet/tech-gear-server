const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

// express app
const app = express();
const port = process.env.PORT || 5000;

// middlewears
app.use(cors());
app.use(express.json());

// connection uri
const uri = `mongodb+srv://sweetmmjjss:${process.env.DB_PASS}@cluster0.ryfvl.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // connect to database
    await client.connect();

    // collections
    const productCollection = client.db("productsDb").collection("products");

    // get products from db
    app.get("/products", async (req, res) => {
      const result = await productCollection.find({}).toArray();

      console.log(result);
      res.json(result);
    });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch((err) => console.dir(err));

app.get("/", (req, res) => {
  res.send("Hello world!");
});

app.listen(port, () => {
  console.log(`App is listening on port: ${port}`);
});
