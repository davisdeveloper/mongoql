import express from "express";
import MongoQL from "mongoql"

//Initialization
const localUri = "mongodb://127.0.0.1:27017/";
const localServer = new MongoQL(localUri);
const app = express();
app.use(express.json());

//Getting DBs and collections
const bookstore = await localServer.getDB("bookstore");
const books = await bookstore.getCollection("books");

app.get("/b", async (req, res) => {
  const p = [];
  await books
    .find()
    .forEach((book) => {
      p.push(book);
    })
    .then((r) => {
      res.status(200).json(p);
    });
});

app.listen(3000, () => {
  console.log("started");
});
