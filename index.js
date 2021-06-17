const express = require("express");
const cors = require("cors");
const mongo = require("mongodb");
const passwordHash = require("password-hash");
const { json } = require("express");

const app = express();

app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3030;

const client = new mongo.MongoClient("mongodb://localhost:27017", {
  useNewUrlParser: true,
});
client.connect();

app.post("/login", (req, res) => {
  const { login, password } = req.body;
  const db = client.db("saveMoneyApp");
  const users = db.collection("users");

  //login query
  users.findOne({ userLogin: login }, (err, data) => {
    if (err) res.json({ logged: false, errorMsg: "error" });
    else {
      if (data !== null) {
        if (passwordHash.verify(password, data.userPassword)) {
          const limits = db.collection("Limits");
          const id = data._id.toString();

          limits.findOne({ userID: id, status: "active" }, (err, limit) => {
            if (limit === null) {
              res.json({
                logged: true,
                userName: data.userName,
                userId: data._id,
                isLimitSet: false,
              });
            } else {
              res.json({
                logged: true,
                userName: data.userName,
                userId: data._id,
                isLimitSet: true,
                limitValue: limit.limitValue,
              });
            }
          });
        } else res.json({ logged: false, errorMsg: "error" });
      } else {
        res.json({ logged: false, errorMsg: "error" });
      }
    }
  });
});

app.post("/register", (req, res) => {
  const { userName, login, password } = req.body;
  const db = client.db("saveMoneyApp");
  const users = db.collection("users");

  users.findOne({ userLogin: login }, (err, data) => {
    if (err) res.json({ status: "error" });
    else {
      if (data === null) {
        const hash = passwordHash.generate(password);
        users.insertOne({
          userName: userName,
          userLogin: login,
          userPassword: hash,
          userRole: "user",
        });
        res.json({ status: "ok" });
      } else {
        res.json({
          status: "error",
        });
      }
    }
  });
});

app.post("/delete-limit", (req, res) => {
  const { userId } = req.body;
  const db = client.db("saveMoneyApp");
  const limits = db.collection("Limits");

  limits.findOne({ userID: userId, status: "active" }, (err, limit) => {
    if (limit !== null) {
      limits.deleteOne({ _id: mongo.ObjectId(limit._id) });
      res.json({ deleted: true });
    } else {
      res.json({ deleted: false });
    }
  });
});

app.post("/setLimit", (req, res) => {
  const db = client.db("saveMoneyApp");
  const limits = db.collection("Limits");

  const { id, value } = req.body;
  limits.findOne({ userID: id, status: "active" }, (err, data) => {
    if (data === null) {
      limits.insertOne(
        { userID: id, limitValue: value, status: "active" },
        (err) => {
          if (err) res.json({ status: "error" });
          else res.json({ status: "ok" });
        }
      );
    } else {
      res.json({ status: "error" });
    }
  });
});

app.get("*", (req, res) => {
  res.send("404", 404);
});

app.post("*", (req, res) => {
  res.send("404", 404);
});

app.listen(port, () => {
  console.log(`server started at http://127.0.0.1:${port}`);
});
