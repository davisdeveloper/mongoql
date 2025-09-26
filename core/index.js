
import { MongoClient } from 'mongodb';
import DBWrapper from './dbwrapper.js';

export default class MongoQL {
  constructor(uri) {
    this.client = new MongoClient(uri);
    this.connected = false;
    this.connectPromise = this.client.connect().then(() => {
      this.connected = true;
    });
  }

  async getDB(dbName) {
    return this.connectPromise.then(() => new DBWrapper(this.client.db(dbName)));
  }

  async close() {
    return this.client.close().then(() => {
      this.connected = false;
    });
  }
}
