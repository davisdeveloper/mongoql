
# MongoQL - Mongo Query Language

**MongoQL** is a fluent, SQL-inspired query builder for MongoDB. It wraps native collections with ergonomic chaining, expressive projection, and intuitive aggregation—without sacrificing runtime correctness or editor visibility.

Built for developers who crave elegance, clarity, and power.

---

## 🚀 Installation

```bash
npm install mongoql
```

---

## 🧠 Philosophy

MongoQL treats MongoDB like a fluent query surface. Instead of juggling raw objects and pipeline arrays, you write expressive chains like:

```js
await books
  .select(["title", { author: "writer" }])
  .where({ genre: "Sci-Fi" })
  .limit(5)
  .exec();
```

It’s declarative, readable, and composable.

---

## 📦 Usage

### 1. Connect to MongoDB

```js
import MongoQL from "mongoql";

const mongo = new MongoQL("mongodb://localhost:27017");
const db = await mongo.getDB("bookstore");
const books = db.getCollection("books");
```

---

## 🔍 CollectionWrapper Methods

### `.select(fields)`

Select specific fields or alias them.

```js
await books.select(["title", "author"]).exec();

await books.select(["title", { author: "writer" }]).exec();

await books.select([
  { title: "bookTitle" },
  { author: "writer" },
  { label: { $concat: ["$title", " by ", "$author"] } }
]).exec();
```

---

### `.where(filter)`

Apply a MongoDB filter.

```js
await books
  .select(["title"])
  .where({ genre: "Fantasy" })
  .exec();
```

---

### `.limit(n)` and `.skip(n)`

Paginate results.

```js
await books
  .select(["title"])
  .limit(10)
  .skip(20)
  .exec();
```

---

### `.sort({ field: 1 | -1 })`

Sort results.

```js
await books
  .select(["title"])
  .sort({ title: 1 })
  .exec();
```

---

### `.addFields({ alias: "$source" })`

Add computed or aliased fields without removing others.

```js
await books
  .select(["*"])
  .addFields({ writer: "$author" })
  .exec();
```

---

### `.groupBy(field)`

Group documents by a field.

```js
await books
  .groupBy("genre")
  .select([{ count: { $sum: 1 } }])
  .exec();
```

---

### `.having(filter)`

Filter grouped results.

```js
await books
  .groupBy("genre")
  .select([{ count: { $sum: 1 } }])
  .having({ count: { $gt: 5 } })
  .exec();
```

---

### `.join({ from, localField, foreignField, as })`

Perform a `$lookup` join.

```js
await books
  .join({
    from: "authors",
    localField: "authorId",
    foreignField: "_id",
    as: "authorDetails"
  })
  .exec();
```

---

### `.exec()`

Execute the built query and return results.

```js
const results = await books
  .select(["title"])
  .where({ genre: "Sci-Fi" })
  .exec();
```

---

### `.safeExec()` - `Coming soon`

Returns `{ data, error }` instead of throwing.

```js
const { data, error } = await books.select(["title"]).safeExec();
```

---

### `.debug()` - `Coming soon`

Inspect the built query before execution.

```js
console.log(books.select(["title"]).where({ genre: "Sci-Fi" }).debug());
```

---

## 🧩 DBWrapper Methods

### `.getCollection(name)`

Returns a `CollectionWrapper`.

```js
const books = db.getCollection("books");
```

### `.listCollections()`

Lists all collections in the database.

```js
const names = await db.listCollections();
```

### `.raw`

Access the native MongoDB `Db` object.

```js
const native = db.raw;
```

---

## 🔌 MongoQL Methods

### `.getDB(name)`

Returns a `DBWrapper`.

```js
const db = await mongo.getDB("bookstore");
```

### `.close()`

Closes the MongoDB connection.

```js
await mongo.close();
```

---

## 🧪 Testing  - `Not available yet`

```bash
npm test
```

Include your own test suite in `/test`.

---

## 📄 License

MIT © Davisville
