const express = require("express");
const cors = require("cors");
const mongo = require("mongodb");
const passwordHash = require("password-hash");

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
                targetValue: limit.targetValue,
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
        {
          userID: id,
          limitValue: parseFloat(value),
          targetValue: 0,
          status: "active",
        },
        (err) => {
          if (err)
            res.json({ status: "error", message: "Something went wrong" });
          else res.json({ status: "ok" });
        }
      );
    } else {
      res.json({
        status: "error",
        message:
          "There is seted up limit, delete current limit to setup a new one",
      });
    }
  });
});

app.post("/setTarget", (req, res) => {
  const db = client.db("saveMoneyApp");
  const limits = db.collection("Limits");

  const { id, value } = req.body;
  limits.findOne({ userID: id, status: "active" }, (err, limit) => {
    if (err) res.json({ status: "error", message: "Something went wrong!" });
    else {
      if (limit !== null) {
        limits.updateOne(
          { _id: mongo.ObjectId(limit._id) },
          { $set: { targetValue: parseFloat(value) } },
          (err) => {
            if (err)
              res.json({ status: "error", message: "Something went wrong!" });
            else res.json({ status: "ok" });
          }
        );
      } else {
        res.json({
          status: "error",
          message: "You need to setup limit first!",
        });
      }
    }
  });
});

app.post("/editLimit", (req, res) => {
  const db = client.db("saveMoneyApp");
  const limits = db.collection("Limits");

  const { id, value } = req.body;
  limits.findOne({ userID: id, status: "active" }, (err, limit) => {
    if (err) res.json({ status: "error", message: "Something went wrong!" });
    else {
      console.log(limit);
      if (limit === null) {
        res.json({
          status: "error",
          message: "You need to setup limit first!",
        });
      } else {
        limits.updateOne(
          { _id: mongo.ObjectId(limit._id) },
          { $inc: { limitValue: parseFloat(value) } },
          (err) => {
            if (err === null) res.json({ status: "ok" });
            else
              res.json({ status: "error", message: "Something went wrong!" });
          }
        );
      }
    }
  });
});

app.post("/loadExpenses", (req, res) => {
  const { id } = req.body;
  const db = client.db("saveMoneyApp");
  const limits = db.collection("Limits");

  limits.findOne({ userID: id, status: "active" }, (err, limit) => {
    if (err) res.json({ status: "error", message: "Something went wrong!" });
    else {
      if (limit === null) {
        res.json({
          status: "error",
          message: "You need to set limit to add product!",
        });
      } else {
        const expenses = db.collection("Expenses");

        expenses
          .find({ limitID: limit._id.toString() })
          .toArray((err, expenses) => {
            if (err) {
              res.json({ status: "error", message: "Something went wrong!" });
            } else {
              if (expenses.length === 0) {
                res.json({
                  status: "no-product",
                  message: "No products added yet!",
                });
              } else {
                res.json({ status: "ok", expenses: expenses });
              }
              res.end();
            }
          });
      }
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
