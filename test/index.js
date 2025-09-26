import MongoQL from "mongoql";
import { BETWEEN, IN, LIKE } from "../sql/index.js";

async function asyncAwait() {
  const mongo = new MongoQL("mongodb://127.0.0.1:27017");
  const db = await mongo.getDB("bookstore");
  const books = db.getCollection("books");
  const results = await books
      .select()
      .addFields()
    .where({
      rating: BETWEEN(1, 10),
      author: LIKE("Brandon"),
      genres: IN(["fantasy"]),
    })
    .exec();
  return results;
}

function thenCatch() {
  const mongo = new MongoQL("mongodb://127.0.0.1:27017");

  mongo
    .getDB("bookstore")
    .then((db) => db.getCollection("books"))
    .then((books) => books.select().exec())
    .then((results) => console.log(results))
    .catch((err) => console.error("MongoQL error:", err));
}

console.log(await asyncAwait());
