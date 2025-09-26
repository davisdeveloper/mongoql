// core/DBWrapper.js
import CollectionWrapper from "./collectionwrapper.js";

/**
 * DBWrapper
 * Wraps a native MongoDB database.
 * Returns CollectionWrapper instances synchronously.
 */
export default class DBWrapper {
  /**
   * @param {import('mongodb').Db} db - native MongoDB database
   */
  constructor(db) {
    if (!db) throw new Error("DBWrapper requires a MongoDB database");
    this.db = db;
  }

  /**
   * Returns a wrapped collection instance.
   * @param {string} name - collection name
   * @returns {CollectionWrapper}
   */
  getCollection(name) {
    const rawCollection = this.db.collection(name);
    return new CollectionWrapper(rawCollection);
  }

  /**
   * Returns the native MongoDB database.
   */
  get raw() {
    return this.db;
  }

  /**
   * Lists all collections in the database.
   * @returns {Promise<string[]>}
   */
  listCollections() {
    return this.db.listCollections().toArray().then(cols => cols.map(c => c.name));
  }
}
