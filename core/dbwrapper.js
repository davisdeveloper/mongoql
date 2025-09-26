import CollectionWrapper from './collectionwrapper.js';

export default class DBWrapper {
  constructor(db) {
    this.db = db;
  }

  getCollection(name) {
    return Promise.resolve(new CollectionWrapper(this.db.collection(name)));
  }
}
