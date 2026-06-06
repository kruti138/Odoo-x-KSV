import mongoose from "mongoose";
import { seed } from "./seed.js";

const collections = ["users", "vendors", "rfqs", "quotations", "approvals", "purchaseOrders", "invoices", "activities", "notifications"];
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

class MemoryStore {
  constructor() {
    this.data = clone(seed);
  }
  async list(name) { return clone(this.data[name] || []); }
  async get(name, id) { return clone((this.data[name] || []).find((item) => item.id === id)); }
  async findOne(name, predicate) { return clone((this.data[name] || []).find(predicate)); }
  async create(name, value) {
    const item = { id: `${name.slice(0, 2)}${Date.now()}`, ...clone(value) };
    this.data[name].unshift(item);
    return clone(item);
  }
  async update(name, id, changes) {
    const index = this.data[name].findIndex((item) => item.id === id);
    if (index < 0) return null;
    this.data[name][index] = { ...this.data[name][index], ...clone(changes) };
    return clone(this.data[name][index]);
  }
}

class MongoStore {
  constructor() {
    const schema = new mongoose.Schema({ _id: String }, { strict: false, versionKey: false });
    this.models = Object.fromEntries(collections.map((name) => [
      name,
      mongoose.models[name] || mongoose.model(name, schema, name)
    ]));
  }
  normalize(doc) {
    if (!doc) return null;
    const value = doc.toObject ? doc.toObject() : doc;
    return { ...value, id: value._id, _id: undefined };
  }
  async seed() {
    for (const name of collections) {
      if (await this.models[name].countDocuments()) continue;
      await this.models[name].insertMany(seed[name].map(({ id, ...value }) => ({ _id: id, ...value })));
    }
  }
  async list(name) { return (await this.models[name].find().lean()).map((doc) => this.normalize(doc)); }
  async get(name, id) { return this.normalize(await this.models[name].findById(id).lean()); }
  async findOne(name, predicate) {
    const all = await this.list(name);
    return all.find(predicate) || null;
  }
  async create(name, value) {
    const id = `${name.slice(0, 2)}${Date.now()}`;
    return this.normalize(await this.models[name].create({ _id: id, ...value }));
  }
  async update(name, id, changes) {
    return this.normalize(await this.models[name].findByIdAndUpdate(id, changes, { new: true }).lean());
  }
}

export async function createStore() {
  if (process.env.USE_MEMORY_DB !== "false" || !process.env.MONGO_URI) return new MemoryStore();
  await mongoose.connect(process.env.MONGO_URI);
  const store = new MongoStore();
  await store.seed();
  return store;
}
