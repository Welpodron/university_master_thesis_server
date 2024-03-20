import express from 'express';

import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares';
import { DB, _models } from '../../db';
import { ValidationError, array, number, object, string, tuple } from 'yup';
import { StatusCodes } from 'http-status-codes';
import { v4 as uuidv4 } from 'uuid';

export const router = express.Router();

const MODEL = 'task';
const BASE_URL = `${MODEL}s`;

export const creationSchema = object({
  startCoords: tuple([
    number()
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
    number()
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
  ]).required(),
  endCoords: tuple([
    number()
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
    number()
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
  ]).required(),
  duration: number()
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
  distance: number()
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

router.get('/routing', async (req, res) => {
  try {
    const routes = await DB.routing.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    const _fields =
      _models.find(
        (_model) =>
          _model.name ===
          (MODEL as string).charAt(0).toUpperCase() + (MODEL as string).slice(1)
      )?.fields ?? [];

    const _tree: Record<string, any> = {};

    for (const _field of _fields) {
      if (_field.name === 'pass' || _field.name === 'role') {
        continue;
      }
      _tree[_field.name] = _field;
    }

    res.json({ data: routes, model: _tree });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json((error as Error).message);
  }
});

router.post('/routing', async (req, res) => {
  try {
    const { startCoords, endCoords, duration, distance } =
      await creationSchema.validate(req.body);

    if (startCoords.toString() === endCoords.toString()) {
      throw new ValidationError('Найдена циклическая зависимость маршрутов');
    }

    const path = await DB.routing.create({
      data: {
        id: uuidv4(),
        startCoords: JSON.stringify(startCoords),
        endCoords: JSON.stringify(endCoords),
        duration,
        distance,
        manual: true,
      },
    });

    return path;
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(StatusCodes.BAD_REQUEST).json((error as Error).message);
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json((error as Error).message);
    }
  }
});

router.delete('/routing', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      throw new ValidationError('Ожидался не пустой список идентификаторов');
    }

    const _ids: string[] = [];

    ids.forEach((id: string) => {
      const _id = String(id).trim();
      if (!_id) {
        return;
      }
      _ids.push(_id);
    });

    if (!_ids.length) {
      throw new ValidationError('Ожидался не пустой список идентификаторов');
    }

    const result = await DB.routing.deleteMany({
      where: {
        id: {
          in: _ids,
        },
      },
    });

    res.json(_ids);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(StatusCodes.BAD_REQUEST).json((error as Error).message);
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json((error as Error).message);
    }
  }
});

// clear routing cache
router.purge('/routing', async (req, res) => {
  try {
    const routes = await DB.routing.deleteMany({ where: { manual: false } });

    res.json(routes);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json((error as Error).message);
  }
});
