// core/CollectionWrapper.js
/**
 * MOngoQL.CollectionWrapper
 * A thin, ergonomic wrapper around a native MongoDB Collection that:
 * - provides fluent, SQL-inspired helpers (.select, .where, .orderBy, .limit, .offset, .join, .groupBy, .having)
 * - builds either a find() + projection path or an aggregation pipeline depending on features used
 * - exposes key native collection methods and a .raw accessor
 *
 * This file is ES module compatible and the class is the default export.
 */

/* eslint-disable no-underscore-dangle */
export default class CollectionWrapper {
    /**
     * @param {import('mongodb').Collection} collection - native MongoDB collection
     */
    constructor(collection) {
        if (!collection)
            throw new Error("CollectionWrapper requires a native MongoDB collection");
        this.collection = collection;

        // Query state (fluent)
        this._resetState();
    }

    // -------------------------
    // Internal state management
    // -------------------------
    _resetState() {
        this.query = {}; // filter object for $match or find()
        this.projection = null; // projection object for $project or find()
        this.sort = null; // sort object for $sort or find()
        this.skipCount = null; // number for $skip
        this.limitCount = null; // number for $limit
        this.joinSpec = null; // $lookup spec
        this.groupSpec = null; // $group spec
        this.havingFilter = null; // post-group $match
        this._isAggregation = false; // set true if any aggregation-only feature used
    }

    // -------------------------
    // Fluent API (mutating, returns this)
    // -------------------------

    /**
     * select([...]) — accepts:
     *  - string fields (in an array)
     *  - alias objects { sourceField: alias } where alias is a string
     *  - computed objects { alias: expression } where expression is a MongoDB aggregation expression
     *
     * Examples:
     *   .select(['title', { author: 'writer' }, { full: { $concat: ['$first', ' ', '$last'] } }])
     */
    select(fields = []) {
        if (!fields || fields.length === 0 || fields.includes("*")) {
            this.projection = null;
            return this;
        }

        const proj = {};
        let hasAggregationFeatures = false;

        for (const item of fields) {
            if (typeof item === "string") {
                proj[item.trim()] = 1;
            } else if (typeof item === "object" && item !== null) {
                for (const [k, v] of Object.entries(item)) {
                    // If v is a string treat as alias: { source: alias }
                    if (typeof v === "string") {
                        proj[v] = `$${k}`; // For find(), we can't do field aliasing
                        // Note: Field aliasing requires aggregation
                        hasAggregationFeatures = true;
                    } else {
                        // Computed expression or direct projection by key
                        proj[k] = v;
                        hasAggregationFeatures = true;
                    }
                }
                this._isAggregation = hasAggregationFeatures;
            }
        }

        this.projection = proj;
        if (hasAggregationFeatures) {
            this._isAggregation = true;
        }
        return this;
    }
    /**
     * addFields({}): 
     *  -For special aliasing while selecting all fields.
     *  - Used after select to aliase specific fields
     * Examples:
     *      -.select(["*"]).addFields({author: 'writer", ...})
     *      -This allows you to alias only the author field while importing all other fields
     *
     * 
     * @param {object} fields 
     * 
     */
    addFields(fields = {}) {
        if (!fields || typeof fields !== "object") {
            throw new Error("addFields expects an object");
        }
        this._addFields = fields;
        this._isAggregation = true;
        return this;
    }
    /**
     * selectAllWithAlias({}): 
     *  -For special aliasing while selecting all fields, in just one command.
     *  - 
     * Examples:
     *      -.selectAllWithAlias({author: "writer"})
     *      -This allows you to alias only the author field while importing all other fields
     *
     * @param {object} aliasMap 
     * 
     */
    selectAllWithAlias(aliasMap = {}) {
        this.projection = null;
        this._addFields = {};
        for (const [source, alias] of Object.entries(aliasMap)) {
            this._addFields[alias] = `$${source}`;
        }
        this._isAggregation = true;
        return this;
    }


    /**
     * where(filter) — accepts a plain Mongo-style filter object.
     * You are expected to use helper factories (IN, LIKE, BETWEEN) before calling .where()
     */
    where(filter = {}) {
        if (!filter || typeof filter !== "object")
            throw new Error(".where expects an object");
        // merge shallowly; last wins
        Object.assign(this.query, filter);
        return this;
    }

    /**
     * orderBy(field, direction = 'asc')
     * direction may be 'asc'|'desc' or 1|-1
     */
    orderBy(field, direction = "asc") {
        if (!field) return this;
        const dir = direction === "desc" || direction === -1 ? -1 : 1;
        this.sort = this.sort || {};
        this.sort[field] = dir;
        return this;
    }

    /**
     * limit(n)
     */
    limit(n) {
        this.limitCount = Number(n);
        return this;
    }

    /**
     * offset(n) alias for skip
     */
    offset(n) {
        this.skipCount = Number(n);
        return this;
    }

    skip(n) {
        return this.offset(n);
    }

    /**
     * join(lookupSpec)
     * Accepts a $lookup-style spec:
     * { from, localField, foreignField, as, pipeline? }
     * Using join forces aggregation mode.
     */
    join(lookupSpec) {
        if (!lookupSpec || typeof lookupSpec !== "object")
            throw new Error("join expects a $lookup spec object");
        this.joinSpec = lookupSpec;
        this._isAggregation = true;
        return this;
    }

    /**
     * groupBy(fieldOrSpec)
     * Accepts a string field or a custom $group spec. Using groupBy forces aggregation mode.
     *
     * Simple form:
     *   .groupBy('genre')
     * produces:
     *   { _id: '$genre', items: { $push: '$$ROOT' } }
     *
     * Advanced caller can pass a full $group object.
     */
    groupBy(fieldOrSpec) {
        if (!fieldOrSpec)
            throw new Error("groupBy expects a field name or a group spec");
        if (typeof fieldOrSpec === "string") {
            this.groupSpec = {
                _id: `$${fieldOrSpec}`,
                items: { $push: "$$ROOT" },
            };
        } else if (typeof fieldOrSpec === "object") {
            this.groupSpec = fieldOrSpec;
        } else {
            throw new Error("groupBy accepts string or object");
        }
        this._isAggregation = true;
        return this;
    }

    /**
     * having(filter) — applied after group $group as a $match for aggregation
     */
    having(filter = {}) {
        if (!filter || typeof filter !== "object")
            throw new Error(".having expects an object");
        this.havingFilter = filter;
        this._isAggregation = true;
        return this;
    }

    /**
     * Checks if the current projection contains any computed fields
     * or alias mappings that require aggregation.
     */
    _projectionRequiresAggregation() {
        if (!this.projection) return false;

        return Object.values(this.projection).some((val) => {
            // If value is an object (e.g. $concat), it's an expression → needs aggregation
            return typeof val === "object" && val !== null;
        });
    }

    // -------------------------
    // Execution
    // -------------------------

    /**
     * exec() — decides between .find() with projection and an aggregation pipeline.
     * Returns a Promise resolving to an array of documents.
     */
    /**
 * exec() — decides between .find() with projection and an aggregation pipeline.
 * Returns a Promise resolving to an array of documents.
 */
    async exec() {
        let result;

        // Choose aggregation when:
        //  - explicit aggregation-only features are used (join, group, computed projection aliases)
        //  - or projection contains aggregation expressions (object values that are objects)
        if (this._isAggregation || this._projectionRequiresAggregation()) {
            const pipeline = [];

            // Stage 1: Filter documents
            if (Object.keys(this.query).length > 0) {
                pipeline.push({ $match: this.query });
            }

            // Stage 2: Join with other collections
            if (this.joinSpec) {
                pipeline.push({ $lookup: this.joinSpec });
            }

            // Stage 3: Group documents
            if (this.groupSpec) {
                pipeline.push({ $group: this.groupSpec });
            }

            // Stage 4: Filter groups (having clause)
            if (this.havingFilter) {
                pipeline.push({ $match: this.havingFilter });
            }

            // Stage 5: Sort documents
            if (this.sort) {
                pipeline.push({ $sort: this.sort });
            }

            // Stage 6: Skip documents
            if (this.skipCount !== null) {
                pipeline.push({ $skip: this.skipCount });
            }

            // Stage 7: Limit documents
            if (this.limitCount !== null) {
                pipeline.push({ $limit: this.limitCount });
            }

            // Stage 8: Project fields (should come after transformations)
            if (this.projection) {
                pipeline.push({ $project: this.projection });
            }

            //Stage 9: Checking addfields was added;
            // Execute aggregation
            const cursor = this.collection.aggregate(pipeline);
            result = await cursor.toArray();
        } else {
            // Use simple find() + projection + sort + skip + limit
            const opts = {};
            if (this.projection) opts.projection = this.projection;
            if (this.sort) opts.sort = this.sort;

            const q = Object.keys(this.query).length > 0 ? this.query : {};
            const cursor = this.collection.find(q, opts);

            if (this.skipCount !== null) cursor.skip(this.skipCount);
            if (this.limitCount !== null) cursor.limit(this.limitCount); // Fixed typo: was .skip()

            result = await cursor.toArray();
        }

        // Reset state so wrapper can be reused
        this._resetState();
        return result;
    }

    /**
     * Convenience: toArray() calls exec() — matches common cursor usage
     */
    async toArray() {
        return this.exec();
    }

    // -------------------------
    // Native passthroughs and raw access
    // -------------------------

    /**
     * raw getter — returns the native collection when you need it
     */
    get raw() {
        return this.collection;
    }

    /**
     * Expose common native methods directly so callers can fallback to raw behavior.
     * These methods forward arguments and return whatever the native call returns.
     * Add more methods as you need them.
     */
    find(filter = {}, options = {}) {
        return this.collection.find(filter, options);
    }

    insertOne(doc, options) {
        return this.collection.insertOne(doc, options);
    }

    insertMany(docs, options) {
        return this.collection.insertMany(docs, options);
    }

    updateOne(filter, update, options) {
        return this.collection.updateOne(filter, update, options);
    }

    updateMany(filter, update, options) {
        return this.collection.updateMany(filter, update, options);
    }

    deleteOne(filter, options) {
        return this.collection.deleteOne(filter, options);
    }

    deleteMany(filter, options) {
        return this.collection.deleteMany(filter, options);
    }

    aggregate(pipeline = [], options = {}) {
        return this.collection.aggregate(pipeline, options);
    }

    forEach(fn) {
        return this.collection.find().forEach(fn);
    }

}
