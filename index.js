const express = require("express");
const cors = require(cors);
require("dotenv").config();

// express app
const app = express();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Hello world!");
});
app.listen(port, () => {
  console.log(`App is listening on port: ${port}`);
});
