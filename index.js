const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const cartCollection = client.db("cartDb").collection("carts");

    // post a cart in to api
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.json(result);
    });

    // get all carts
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const result = await cartCollection.find({ email }).toArray();
      res.json(result);
    });
    // delete from carts
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params;
      console.log(id);
      const result = await cartCollection.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });
    // get products from db
    app.get("/products", async (req, res) => {
      const result = await productCollection.find({}).toArray();

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
