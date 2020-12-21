import express from "express";
import passport from "passport";
import { default as PassportHttp } from "passport-http";
import Cryptr from "cryptr";
import dotEnv from "dotenv";
import cors from "cors";
import { Model } from "./Model.mjs";
import { addCrudRouter } from "./addCrudRouter.mjs";

dotEnv.config();

const app = express();
const port = process.env.PORT || 3001;
const logger = console.log;
const debug = true;

const cryptr = new Cryptr(process.env.CA_CRYPTR_SECRET); //required

const superAdmin = {
  username: process.env.CA_SUPER_USER_NAME || "demo",
  password: process.env.CA_SUPER_USER_PWD || "demo",
  emailId: process.env.CA_SUPER_USER_EMAIL_ID || "demo@test.test",
  admin: true,
};

const userModelDefault =
  superAdmin.username && superAdmin.password && superAdmin.emailId
    ? { data: [superAdmin] }
    : null;

const Users = new Model("users.enc", {
  serialize(data) {
    return cryptr.encrypt(JSON.stringify(data));
  },
  deserialize(data) {
    return JSON.parse(cryptr.decrypt(data));
  },
  ...(userModelDefault ? { defaultValue: userModelDefault } : {}),
});

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
      const [user = null] = Users.readRec({
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

const Students = new Model("students");
addCrudRouter(app, "/student", Students, auth(NonAdminDigestKey));

const Courses = new Model("courses");
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
    const [user] = Users.readRec({
      key: "username",
      value: req.body.username,
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

app.get("/me", auth(NonAdminDigestKey), (req, res) => {
  const [user] = Users.readRec({ key: "username", value: req.user });
  if (user) {
    return res.json(user);
  }
  return res.status(404).json({ message: "User not found." });
});

app.listen(port, () => {
  logger(`server started on host/${port}`);
});

export { app };
