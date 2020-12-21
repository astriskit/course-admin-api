import lowDb from "lowdb";
import FileSync from "lowdb/adapters/FileSync.js";
import { nanoid } from "nanoid";

const getDBHandle = (db, adapterOpts) => {
  let adapter;
  if (!db.includes(".")) {
    db += ".json";
  }

  const dbPath = `${process.env.CB_DB_DIR || "./db"}/${db}`;

  if (adapterOpts) {
    adapter = new FileSync(dbPath, {
      defaultValue: { data: [] },
      ...adapterOpts,
    });
  } else {
    adapter = new FileSync(dbPath, { defaultValue: { data: [] } });
  }
  const dbHandle = lowDb(adapter);
  return dbHandle;
};

const idLength = 8;

export class Model {
  constructor(db, adapterOpts = null) {
    this.db = getDBHandle(db, adapterOpts);
  }

  readRec(opts) {
    const {
      pagination: { perPage = "", page = "" } = {},
      filter: { key, value } = { key: "", value: "" },
      sort: { by: sortBy, order = "desc" } = { by: "", order: "" },
    } = opts || {};

    let data = this.db.get("data");
    if (key && value) {
      data = data.filter([key, value]);
    }
    if (sortBy && order) {
      data = data.orderBy(sortBy, order);
    }
    if (perPage && page) {
      data = data.takeWhile((_, index) => {
        const tillIndex = page * perPage;
        let firstIndex = tillIndex - perPage + 1;
        firstIndex = firstIndex < 0 ? 0 : firstIndex;
        return index >= firstIndex && index <= tillIndex;
      });
    }
    return data.value();
  }

  add(data) {
    const id = nanoid(idLength);
    this.db
      .get("data")
      .push({ id, ...data })
      .write();
    return this.db.get("data").find({ id }).value();
  }

  update(dataId, newData) {
    this.db
      .get("data")
      .find({ id: dataId })
      .assign({ id: dataId, ...newData })
      .write();
    return this.db.get("data").find({ id: dataId }).value();
  }

  delete(dataId) {
    this.db.get("data").remove({ id: dataId }).write();
  }
}
