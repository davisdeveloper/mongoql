// core/index.js
import { MongoClient } from "mongodb";
import DBWrapper from "./dbwrapper.js";

/**
 * MongoQL
 * Entry point for fluent MongoDB access.
 * Can be used with async/await or .then/.catch.
 */
export default class MongoQL {
  /**
   * @param {string} uri - MongoDB connection URI
   */
  constructor(uri) {
    if (!uri) throw new Error("MongoQL requires a MongoDB URI");
    this.client = new MongoClient(uri);
    this._connected = false;
    this._connectPromise = this.client.connect().then(() => {
      this._connected = true;
    });
  }

  /**
   * Returns a wrapped database instance.
   * @param {string} dbName
   * @returns {Promise<DBWrapper>}
   */
  getDB(dbName) {
    return this._connectPromise.then(() => {
      const db = this.client.db(dbName);
      return new DBWrapper(db);
    });
  }

  /**
   * Closes the MongoDB connection.
   * @returns {Promise<void>}
   */
  close() {
    return this.client.close();
  }
}
