import express from 'express';

import { object, date, boolean } from 'yup';

import DB from '../db';
import { auth } from '../middlewares/auth';

import { USER_ROLES } from '../constants';

export const jobRouter = express.Router();

const jobCreationSchema = object({
  date: date()
    .min(new Date(new Date().setHours(0, 0, 0, 0)))
    .required(),
});

const jobUpdateSchema = object({
  date: date().min(new Date(new Date().setHours(0, 0, 0, 0))),
  completed: boolean(),
});

jobRouter.get('/jobs', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const jobs = await DB.job.findMany();

    res.json(jobs);
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

jobRouter.post('/jobs', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const { date } = await jobCreationSchema.validate(req.body);

    const job = await DB.job.create({
      data: {
        date,
      },
    });

    res.json(job);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

jobRouter.put('/jobs/:id', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const { id } = req.params;

    const { date, completed } = await jobUpdateSchema.validate(req.body);

    const job = await DB.job.update({
      where: {
        id: Number(id),
      },
      data: {
        ...(date instanceof Date && { date }),
        ...(completed != null && { completed }),
      },
    });

    res.json(job);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

jobRouter.delete('/jobs', auth(USER_ROLES.MANAGER), async (req, res) => {
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

    const jobs = await DB.job.deleteMany({
      where: {
        id: {
          in: _ids,
        },
      },
    });

    res.json(jobs);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});
