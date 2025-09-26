export default class CollectionWrapper {
  constructor(collection) {
    this.collection = collection;
    this.query = {};
    this.projection = null;
    this.sort = null;
    this.limitCount = null;
    this.skipCount = null;
    this.distinctField = null;
    this.groupField = null;
    this.havingFilter = null;
    this.joinSpec = null;
  }

  select(fields) {
    if (!fields || fields.length === 0 || fields.includes('*')) {
      this.projection = null;
    } else {
      this.projection = {};
      fields.forEach(field => {
        this.projection[field.trim()] = 1;
      });
    }
    return this;
  }

  where(filter) {
    this.query = { ...this.query, ...filter };
    return this;
  }

  orderBy(field, direction = 'asc') {
    this.sort = { [field]: direction === 'asc' ? 1 : -1 };
    return this;
  }

  limit(n) {
    this.limitCount = n;
    return this;
  }

  offset(n) {
    this.skipCount = n;
    return this;
  }

  distinct(field) {
    this.distinctField = field;
    return this;
  }

  groupBy(field) {
    this.groupField = field;
    return this;
  }

  having(filter) {
    this.havingFilter = filter;
    return this;
  }

  join({ from, localField, foreignField, as }) {
    this.joinSpec = { from, localField, foreignField, as };
    return this;
  }

  async exec() {
    if (this.distinctField) {
      return await this.collection.distinct(this.distinctField, this.query);
    }

    if (this.groupField || this.joinSpec) {
      const pipeline = [];

      if (Object.keys(this.query).length > 0) {
        pipeline.push({ $match: this.query });
      }

      if (this.joinSpec) {
        pipeline.push({ $lookup: this.joinSpec });
      }

      if (this.groupField) {
        pipeline.push({
          $group: {
            _id: `$${this.groupField}`,
            items: { $push: '$$ROOT' }
          }
        });
      }

      if (this.havingFilter) {
        pipeline.push({ $match: this.havingFilter });
      }

      if (this.sort) {
        pipeline.push({ $sort: this.sort });
      }

      if (this.skipCount !== null) {
        pipeline.push({ $skip: this.skipCount });
      }

      if (this.limitCount !== null) {
        pipeline.push({ $limit: this.limitCount });
      }

      return await this.collection.aggregate(pipeline).toArray();
    }

    let cursor = this.collection.find(this.query, this.projection ? { projection: this.projection } : {});

    if (this.sort) cursor = cursor.sort(this.sort);
    if (this.skipCount !== null) cursor = cursor.skip(this.skipCount);
    if (this.limitCount !== null) cursor = cursor.limit(this.limitCount);

    return await cursor.toArray();
  }

  then(resolve, reject) {
    this.exec().then(resolve).catch(reject);
  }

  insert(data) {
    return Array.isArray(data)
      ? this.collection.insertMany(data)
      : this.collection.insertOne(data);
  }

  update(filter, update) {
    return this.collection.updateMany(filter, update);
  }

  delete(filter) {
    return this.collection.deleteMany(filter);
  }
}
