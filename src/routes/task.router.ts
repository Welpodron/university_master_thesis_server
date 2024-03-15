import express from 'express';

import { object, number } from 'yup';

import DB, { _models } from '../db';
import { auth } from '../middlewares/auth';

import { USER_ROLES } from '../constants';

export const taskRouter = express.Router();

const taskCreationSchema = object({
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

const taskUpdateSchema = object({
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

taskRouter.get('/_tasksModel', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const _fields =
      _models.find((model) => model.name === 'Task')?.fields ?? [];

    const _tree: Record<string, any> = {};

    for (const _field of _fields) {
      _tree[_field.name] = _field;
    }

    res.json(_tree);
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

taskRouter.get('/tasks', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const tasks = await DB.task.findMany();

    res.json(tasks);
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

taskRouter.post('/tasks', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const { demand, latitude, longitude } = await taskCreationSchema.validate(
      req.body
    );

    const task = await DB.task.create({
      data: {
        demand,
        latitude,
        longitude,
      },
    });

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(400).json((error as Error).message);
  }
});

taskRouter.put('/tasks/:id', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const { id } = req.params;

    const { demand, latitude, longitude } = await taskUpdateSchema.validate(
      req.body
    );

    const task = await DB.task.update({
      where: {
        id: Number(id),
      },
      data: {
        ...(demand && { demand }),
        ...(latitude != null && { latitude }),
        ...(longitude != null && { longitude }),
      },
    });

    res.json(task);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

taskRouter.delete('/tasks', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      throw new Error('Ожидался не пустой список идентификаторов');
    }

    const _ids: number[] = [];

    ids.forEach((id: string) => {
      const _id = parseInt(id);
      if (isNaN(_id) || _id <= 0) {
        return;
      }
      _ids.push(_id);
    });

    if (!_ids.length) {
      throw new Error('Ожидался не пустой список идентификаторов');
    }

    const tasks = await DB.task.deleteMany({
      where: {
        id: {
          in: _ids,
        },
      },
    });

    res.json(tasks);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});
