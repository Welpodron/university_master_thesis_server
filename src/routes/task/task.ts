import express from 'express';

import { object, number } from 'yup';

import { USER_ROLES } from '../../constants';
import { auth, read, update, remove, create } from '../../middlewares';

const MODEL = 'task';
const BASE_URL = `${MODEL}s`;

export const router = express.Router();

export const creationSchema = object({
  demand: number().nonNullable().integer().min(1).required(),
  latitude: number()
    .test({
      name: 'is-finite',
      test(value, ctx) {
        if (!Number.isFinite(value)) {
          return ctx.createError({
            message: 'Число не должно являться бесконечностью',
          });
        }
        return true;
      },
    })
    .required(),
  longitude: number()
    .test({
      name: 'is-finite',
      test(value, ctx) {
        if (!Number.isFinite(value)) {
          return ctx.createError({
            message: 'Число не должно являться бесконечностью',
          });
        }
        return true;
      },
    })
    .required(),
});

export const updateSchema = object({
  demand: number().integer().min(1),
  latitude: number().test({
    name: 'is-finite',
    test(value, ctx) {
      if (value !== undefined && !Number.isFinite(value)) {
        return ctx.createError({
          message: 'Число не должно являться бесконечностью',
        });
      }
      return true;
    },
  }),
  longitude: number().test({
    name: 'is-finite',
    test(value, ctx) {
      if (value !== undefined && !Number.isFinite(value)) {
        return ctx.createError({
          message: 'Число не должно являться бесконечностью',
        });
      }
      return true;
    },
  }),
});

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
