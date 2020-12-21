import Cryptr from "cryptr";
import { Model } from "./Model.mjs";

import dotEnv from "dotenv";
import { nanoid } from "nanoid";
dotEnv.config();

const cryptr = new Cryptr(process.env.CA_CRYPTR_SECRET); //required

const superAdmin = {
  username: process.env.CA_SUPER_USER_NAME || "demo",
  password: process.env.CA_SUPER_USER_PWD || "demo",
  emailId: process.env.CA_SUPER_USER_EMAIL_ID || "demo@test.test",
  admin: true,
};

const userModelDefault =
  superAdmin.username && superAdmin.password && superAdmin.emailId
    ? { data: [{ ...superAdmin, id: nanoid(8) }], count: 1 }
    : null;

export const UsersModel = new Model("users.enc", {
  serialize(data) {
    return cryptr.encrypt(JSON.stringify(data));
  },
  deserialize(data) {
    return JSON.parse(cryptr.decrypt(data));
  },
  ...(userModelDefault ? { defaultValue: userModelDefault } : {}),
});
