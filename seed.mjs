import dotEnv from "dotenv";
dotEnv.config();

import { nanoid } from "nanoid";
import { UsersModel as Users } from "./UsersModel.mjs";
import { StudentsModel as Students } from "./StudentsModel.mjs";
import { CoursesModel as Courses } from "./CoursesModel.mjs";
import { students } from "./seed-students.mjs";
import { courses } from "./seed-courses.mjs";

const idLength = 8;

Users.db
  .get("data")
  .push({
    username: "test",
    password: "test",
    emailId: "test@test.test",
    admin: false,
    id: nanoid(idLength),
  })
  .write();
Users.db.set("count", 2).write();

students.map((rec) =>
  Students.db
    .get("data")
    .push({ ...rec, id: nanoid(idLength), courses: [] })
    .write()
);
Students.db.set("count", Students.db.get("data").value().length).write();

courses.map((rec) =>
  Courses.db
    .get("data")
    .push({ ...rec, id: nanoid(idLength) })
    .write()
);
Courses.db.set("count", Courses.db.get("data").value().length).write();
