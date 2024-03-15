import express from 'express';

import { object, date, boolean } from 'yup';
import { USER_ROLES } from '../../constants';
import { auth, create, model, read, remove, update } from '../../middlewares';

const MODEL = 'job';
const TABLE = 'Job';
const BASE_URL = `${MODEL}s`;

export const router = express.Router();

const creationSchema = object({
  date: date()
    .min(new Date(new Date().setHours(0, 0, 0, 0)))
    .required(),
});

const updateSchema = object({
  date: date().min(new Date(new Date().setHours(0, 0, 0, 0))),
  completed: boolean(),
});

router.get(`/_${BASE_URL}Model`, auth(USER_ROLES.MANAGER), model(TABLE));

router.get(`/${BASE_URL}`, auth(USER_ROLES.MANAGER), read(MODEL));

router.post(
  `/${BASE_URL}`,
  auth(USER_ROLES.MANAGER),
  create(MODEL, creationSchema)
);

router.put(
  `/${BASE_URL}/:id`,
  auth(USER_ROLES.MANAGER),
  update(MODEL, updateSchema)
);

router.delete(`/${BASE_URL}`, auth(USER_ROLES.MANAGER), remove(MODEL));
