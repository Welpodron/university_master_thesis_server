import express from 'express';

import { object, number, string } from 'yup';

import DB from '../db';
import { auth } from '../middlewares/auth';

import { USER_ROLES } from '../constants';

export const vehicleRouter = express.Router();

const vehicleCreationSchema = object({
  name: string().required().min(3),
  capacity: number().nonNullable().integer().min(1).required(),
});

const vehicleUpdateSchema = object({
  name: string().min(3),
  capacity: number().integer().min(1),
});

vehicleRouter.get('/vehicles', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const vehicles = await DB.vehicle.findMany();

    res.json(vehicles);
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

vehicleRouter.post('/vehicles', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const { name, capacity } = await vehicleCreationSchema.validate(req.body);

    const vehicle = await DB.vehicle.create({
      data: {
        name,
        capacity,
      },
    });

    res.json(vehicle);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

vehicleRouter.put(
  '/vehicles/:id',
  auth(USER_ROLES.MANAGER),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { name, capacity } = await vehicleUpdateSchema.validate(req.body);

      const vehicle = await DB.vehicle.update({
        where: {
          id: Number(id),
        },
        data: {
          ...(capacity && { capacity }),
          ...(name != null && { name }),
        },
      });

      res.json(vehicle);
    } catch (error) {
      res.status(400).json((error as Error).message);
    }
  }
);

vehicleRouter.delete(
  '/vehicles',
  auth(USER_ROLES.MANAGER),
  async (req, res) => {
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

      const vehicles = await DB.vehicle.deleteMany({
        where: {
          id: {
            in: _ids,
          },
        },
      });

      res.json(vehicles);
    } catch (error) {
      res.status(400).json((error as Error).message);
    }
  }
);
