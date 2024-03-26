import express from 'express';

import { USER_ROLES } from '../../constants';
import { auth } from '../../middlewares';
import { DB } from '../../db';
import { ValidationError, array, number, object, string, tuple } from 'yup';
import { StatusCodes } from 'http-status-codes';

// DEFAULT DEPOT LOCATION FOR TESTING PURPS: [55.746081,37.887085]

export const router = express.Router();

export const updateSchema = object({
  depotLocation: tuple([
    number().test({
      name: 'is-finite',
      test(value, ctx) {
        if (!Number.isFinite(value)) {
          return ctx.createError({
            message: 'Число не должно являться бесконечностью',
          });
        }
        return true;
      },
    }),
    number().test({
      name: 'is-finite',
      test(value, ctx) {
        if (!Number.isFinite(value)) {
          return ctx.createError({
            message: 'Число не должно являться бесконечностью',
          });
        }
        return true;
      },
    }),
  ]),
  routingAlgo: string(),
  routingKey: string(),
  routingAlgoIterations: number().integer().min(1),
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await DB.settings.findFirst({
      where: {
        id: -1,
      },
    });

    res.json(settings);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json((error as Error).message);
  }
});

router.put('/settings', async (req, res) => {
  try {
    const data = await updateSchema.validate(req.body);

    const settings = await DB.settings.upsert({
      where: {
        id: -1,
      },
      update: {
        ...(data.depotLocation
          ? { depotLocation: JSON.stringify(data.depotLocation) }
          : {}),
        ...(data.routingAlgo ? { routingAlgo: data.routingAlgo } : {}),
        ...(data.routingKey ? { routingKey: data.routingKey } : {}),
        ...(data.routingAlgoIterations
          ? { routingAlgoIterations: data.routingAlgoIterations }
          : {}),
      },
      create: {
        id: -1,
        depotLocation: '[]',
        routingKey: '',
        routingAlgo: 'ABC_CLARKE',
        routingAlgoIterations: 100,
      },
    });

    res.json(settings);
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

router.purge('/settings', async (req, res) => {
  try {
    const settings = await DB.settings.upsert({
      where: {
        id: -1,
      },
      update: {
        id: -1,
        depotLocation: '[]',
        routingKey: '',
        routingAlgo: 'ABC_CLARKE',
        routingAlgoIterations: 100,
      },
      create: {
        id: -1,
        depotLocation: '[]',
        routingKey: '',
        routingAlgo: 'ABC_CLARKE',
        routingAlgoIterations: 100,
      },
    });

    res.json(settings);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json((error as Error).message);
  }
});
