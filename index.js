const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
    const userCollection = client.db("usersDb").collection("users");
    const cartCollection = client.db("cartDb").collection("carts");
    const productCollection = client.db("productsDb").collection("products");
    const paymentCollection = client.db("productsDb").collection("payments");

    // verifytoken middlewear
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access!" });
      }

      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
          return res.status(403).send({ message: "Forbidden access!" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded?.email;
      console.log(req.decoded.email);
      const user = await userCollection.findOne({ email });

      if (user?.role !== "admin" && user?.role !== "demo-admin") {
        return res.status(403).send({ message: "forbidden access!" });
      }

      req.role = user?.role;
      next();
    };
    // jwt api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });

      res.json({ token });
    });

    // user api
    // post a user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.json({ message: "Login successfully!", isertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.json({ message: "User created successfully.", data: result });
    });

    // get all users (only admin cand demo admin can do this)
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find({}).toArray();
      res.json(result);
    });

    // delete user
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(filter);
      res.json(result);
    });

    // make admin
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };

        const result = await userCollection.updateOne(filter, updatedDoc);
        res.json(result);
      }
    );

    // check if user is admin or not
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized access!" });
      }

      const user = await userCollection.findOne({
        email: req.params.email,
      });

      console.log(user);

      if (user?.role === "admin" || user?.role === "demo-admin") {
        return res.json({ isAdmin: true });
      }

      res.json({ isAdmin: false });
    });

    // post a cart in to api
    app.post("/carts", verifyToken, async (req, res) => {
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
    app.delete("/carts/:id", verifyToken, async (req, res) => {
      const id = req.params;
      const filter = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(filter);
      res.json(result);
    });

    // get products from db
    app.get("/products", async (req, res) => {
      console.log(req.query);
      if (req.query.category) {
        const query = { category: req.query.category };
        const result = await productCollection.find(query).toArray();
        return res.json(result);
      }
      const result = await productCollection.find({}).toArray();
      console.log("requested for products", result);
      res.json(result);
    });
    // get single product from db
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productCollection.findOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    // update a product
    app.put("/products/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const updatedDoc = {
        $set: {
          product,
        },
      };
      const result = await productCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        updatedDoc
      );

      res.json(result);
    });

    // delete product
    app.delete("/products/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.json(result);
    });

    // post a product
    app.post("/products", verifyToken, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.json(result);
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      console.log(req.body);
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      console.log("Price:", amount);

      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // post payment after checkout
    app.post("/payments", verifyToken, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      const deleteQuery = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };

      const deleteResult = await cartCollection.deleteMany(deleteQuery);
      res.json({ result, deleteResult });
    });

    // payments
    app.get("/payments/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access!" });
      }
      const result = await paymentCollection.find({ email }).toArray();
      res.json(result);
    });

    // admin status
    app.get("/admin-stats", async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const products = await productCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      const result = await productCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$price" },
            },
          },
        ])
        .toArray();

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({ users, products, orders, revenue });
    });

    // order stats
    app.get("/order-stats", async (req, res) => {
      // db.getSiblingDB("productsDb");
      const result = await paymentCollection
        .aggregate([
          {
            $unwind: "$productIds",
          },
          {
            $set: {
              productIds: { $toObjectId: "$productIds" },
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "productIds",
              foreignField: "_id",
              as: "products",
            },
          },
          {
            $unwind: "$products",
          },
          {
            $group: {
              _id: "$products.category",
              quantity: {
                $sum: 1,
              },
              revenue: {
                $sum: "$products.price",
              },
            },
          },
        ])
        .toArray();

      res.send(result);
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
