import { Prisma, PrismaClient } from '@prisma/client';

import express from 'express';
import cors from 'cors';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany();

    res.json(tasks);
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

app.delete('/tasks', async (req, res) => {
  try {
    const posts = await prisma.task.deleteMany({});

    res.json(posts);
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

app.post('/task', async (req, res) => {
  const { demand, latitude, longitude } = req.body;

  try {
    const result = await prisma.task.create({
      data: {
        demand,
        longitude,
        latitude,
      },
    });

    res.json(result);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

app.put('/task/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).end();
  }

  const { demand, latitude, longitude } = req.body;

  const data: Record<string, any> = {};

  if (demand) {
    data.demand = demand;
  }

  if (latitude) {
    data.latitude = latitude;
  }

  if (longitude) {
    data.longitude = longitude;
  }

  if (!Object.values(data).length) {
    return res.status(400).end();
  }

  try {
    const post = await prisma.task.update({
      where: {
        id: Number(id),
      },
      data,
    });

    res.json(post);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

app.delete('/task', async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).end();
  }

  const _ids: number[] = [];

  ids.forEach((id) => {
    const _id = parseInt(id);
    if (isNaN(_id) || _id <= 0) {
      return;
    }
    _ids.push(_id);
  });

  if (!_ids.length) {
    return res.status(400).end();
  }

  try {
    const posts = await prisma.task.deleteMany({
      where: {
        id: {
          in: _ids,
        },
      },
    });

    res.json(posts);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

export { prisma, app };
