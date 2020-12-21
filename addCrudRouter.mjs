import express from "express";

export const addCrudRouter = (app, key, model, authMw, onDelete = null) => {
  const list = `${key}/list`;
  const listOne = `${key}/:id`;
  const createOne = `${key}/create`;
  const updateOne = `${key}/:id`;
  const deleteOne = `${key}/:id`;

  const parseJSONBody = express.json();

  app.use(`^${key}`, (req, _, next) => {
    req.model = model;
    return next();
  });

  app.get(list, authMw, (req, res) => {
    const page = req.query.page || undefined;
    const perPage = req.query.per_page || undefined;
    const filterKey = req.query.filter_key || undefined;
    const filterValue = req.query.filter_value || undefined;
    const sortBy = req.query.sort_by || undefined;
    const order = req.query.sort_order || undefined;
    const data = req.model.readRec({
      page,
      perPage,
      filter: { key: filterKey, value: filterValue },
      sort: { sortBy, order },
    });
    if (data.length) {
      return res.status(200).json(data);
    } else {
      return res.status(200).json([]);
    }
  });

  app.get(listOne, authMw, (req, res) => {
    const id = req.params.id;
    const record = req.model.readRec({ filter: { key: "id", value: id } });
    if (record.length) {
      return res.status(200).json(record[0]);
    } else {
      return res.status(404).json({ message: "student not found" });
    }
  });

  app.use(createOne, parseJSONBody);
  app.post(createOne, authMw, (req, res) => {
    const data = req.body;
    const record = req.model.add(data);
    return res.status(201).json(record);
  });

  app.use(updateOne, parseJSONBody);
  app.put(updateOne, authMw, (req, res) => {
    const idx = req.params.id;
    const { id: _ = null, ...uRecord } = req.body;
    const record = req.model.update(idx, uRecord);
    return res.status(200).json(record);
  });

  app.delete(deleteOne, authMw, (req, res) => {
    const id = req.params.id;
    if (req.model.readRec({ filter: { key: "id", value: id } }).length) {
      req.model.delete(id);
      onDelete && onDelete(id);
      return res.status(204).json();
    }
    return res.status(404).json({ message: "record not found" });
  });

  app.use((err, req, res, next) => {
    if (err) {
      return res.status(500).send({
        message: err.message,
        display: `Internal server error on ${req.url}`,
      });
    }
    return next();
  });
};
