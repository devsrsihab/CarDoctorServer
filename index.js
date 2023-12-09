const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// db start
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hteerze.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify token middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  // if token if not found
  if (!token) {
    return res.status(401).send({ message: "your token hanve not" });
  }
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    //if token is not valid
    if (err) {
      return res.status(401).send({ message: "token not correct or expired" });
    }

    //2. if success
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // database and collections name
    const carServicesCollection = client.db("cardoctor").collection("services");
    const carOrderCollection = client.db("cardoctor").collection("orders");

    // auth apis
    app.post("/jwtToken", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // client side apis
    // exicute the query throw get api
    app.get("/services", async (req, res) => {
      // make a cursor for all servies data
      const cursor = carServicesCollection.find({});
      // get all data from db
      const resutl = await cursor.toArray();
      res.send(resutl);
    });

    // get specific data from servies collection
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        // Include only the `title` and `imdb` fields in each returned document
        projection: { title: 1, price: 1, img: 1 },
      };

      const resutl = await carServicesCollection.findOne(query, options);
      res.send(resutl);
    });

    // post order car
    app.post("/service/order", (req, res) => {
      const order = req.body;
      // console.log(order);
      const result = carOrderCollection.insertOne(order);
      res.send(result);
    });

    // get order view for specifice user
    app.get("/service/orders", verifyToken, async (req, res) => {

      // if token email is correct with request query email
      if (req.query.email !== req.user.email) {
        console.log('token user email and req email not valid');
        return res
          .status(403)
          .send({ message: "token user email and req email not valid" });
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const resutl = await carOrderCollection.find(query).toArray();
      res.send(resutl);
    });

    // order update
    app.patch("/service/orders/:id", async (req, res) => {
      const id = req.params.id;
      const updateOrder = req.body;
      const filter = { _id: new ObjectId(id) };
      console.log(updateOrder);
      const updateOrderStatus = {
        $set: {
          status: updateOrder.status,
        },
      };
      const result = await carOrderCollection.updateOne(
        filter,
        updateOrderStatus
      );
      res.send(result);
    });

    // order delete
    app.delete("/service/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await carOrderCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// routes
app.get("/", (req, res) => {
  res.send("card doctor is running");
});
app.listen(port, () => {
  console.log("server is running");
});
