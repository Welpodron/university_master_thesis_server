import express from 'express';

import { object, number, string } from 'yup';
import { USER_ROLES } from '../../constants';
import { auth, create, read, readOne, remove, update } from '../../middlewares';

const MODEL = 'vehicle';
const BASE_URL = `${MODEL}s`;

export const router = express.Router();

export const creationSchema = object({
  name: string().required().min(3),
  capacity: number().nonNullable().integer().min(1).required(),
});

export const updateSchema = object({
  name: string().min(3),
  capacity: number().integer().min(1),
});

router.get(`/${BASE_URL}`, auth(USER_ROLES.MANAGER), read(MODEL));

router.get(`/${BASE_URL}/:id`, auth(), readOne(MODEL));

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
