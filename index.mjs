import dotEnv from "dotenv";
dotEnv.config();

import express from "express";
import passport from "passport";
import { default as PassportHttp } from "passport-http";
import cors from "cors";
import { addCrudRouter } from "./addCrudRouter.mjs";
import { UsersModel as Users } from "./UsersModel.mjs";
import { StudentsModel as Students } from "./StudentsModel.mjs";
import { CoursesModel as Courses } from "./CoursesModel.mjs";

const app = express();
const port = process.env.PORT || 3001;
const logger = console.log;
const debug = true;

app.use(
  cors({
    exposedHeaders: ["www-authenticate"],
  })
);

app.use((req, _, next) => {
  if (debug) {
    logger(`Logging requests: ${req.url}, ${req.method}`);
  }
  next();
});

const AdminDigestKey = "admin";
const NonAdminDigestKey = "non-admin";
const genBasicStrategy = (admin = false) => {
  return new PassportHttp.BasicStrategy(function (username, password, cb) {
    try {
      const {
        data: [user = null],
      } = Users.readRec({
        filter: { key: "username", value: username },
      });
      if (user) {
        if (user.password === password) {
          if (admin) {
            if (user.admin) {
              return cb(null, true);
            }
            return cb(null, false);
          }
          return cb(null, true);
        }
      }
      return cb(null, false);
    } catch (err) {
      return cb(err);
    }
  });
};

passport.use(AdminDigestKey, genBasicStrategy(true));

passport.use(NonAdminDigestKey, genBasicStrategy(false));

const auth = (key) => {
  return passport.authenticate(key, {
    session: false,
  });
};

addCrudRouter(app, "/student", Students, auth(NonAdminDigestKey));

const hookDelete = (id) => {
  Students.db
    .get("data")
    .map((student) => {
      student.courses = student.courses.filter((course) => course !== id);
      return student;
    })
    .write();
};
addCrudRouter(app, "/course", Courses, auth(NonAdminDigestKey), hookDelete);

addCrudRouter(app, "/user", Users, auth(AdminDigestKey));

app.post("/login", express.json(), (req, res) => {
  if (req.body.username && req.body.password) {
    const {
      data: [user],
    } = Users.readRec({
      filter: {
        key: "username",
        value: req.body.username,
      },
    });
    if (user && user.password === req.body.password) {
      return res.json({
        login: true,
      });
    }
    return res.status(401).json({ login: false });
  }
  return res.status(400).json();
});

app.get("/me/:user", auth(NonAdminDigestKey), (req, res) => {
  const {
    data: [user],
  } = Users.readRec({ filter: { key: "username", value: req.params.user } });
  if (user) {
    return res.json(user);
  }
  return res.status(404).json({ message: "User not found." });
});

app.get("/", (req, res)=>{
  const appUrl = "https://towering-buttered-lily.glitch.me/";
  res.redirect(appUrl);
})

app.listen(port, () => {
  logger(`server started on host/${port}`);
});

export { app };
