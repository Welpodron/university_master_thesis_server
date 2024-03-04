import { Prisma, PrismaClient } from '@prisma/client';

import fs from 'fs/promises';

import express from 'express';
import cors from 'cors';
import { getDistanceWithOpenRouteService } from './pather';
import {
  getSolutionRoutesFlat,
  getSolutionTotalDistanceFlat,
  sleep,
} from './utils';
import { ProblemType } from './reader';
import { bee } from './bee';
import {
  checkAllLocationsVisitedOnce,
  checkCapacity,
  checkDepotsPlacement,
} from './constrains';

import { hook, notify } from './_debugger';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/_debug', hook);

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

app.get('/cache', async (req, res) => {
  try {
    const depot = {
      id: -1,
      latitude: 55.746081,
      longitude: 37.887085,
      demand: -1,
    };

    const tasks = await prisma.task.findMany();

    if (!tasks.length) {
      return;
    }

    tasks.unshift(depot);

    let cache: {
      startId: number;
      endId: number;
      distance: number;
    }[] = [];

    try {
      const buffer = await fs.readFile('./_cache');

      let data = buffer.toString().trim();

      if (data.length) {
        cache = JSON.parse(data);
      }
    } catch (_) {
      console.log('Cache file was not found or corrupted');
    }

    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        if (
          cache.some(
            (data) =>
              (data.startId == tasks[i].id && data.endId == tasks[j].id) ||
              (data.endId == tasks[i].id && data.startId == tasks[j].id)
          )
        ) {
          continue;
        }

        try {
          await sleep({ ms: 2500 });

          console.log(`Fetching path from: ${tasks[i].id} to: ${tasks[j].id}`);

          const distance = await getDistanceWithOpenRouteService({
            startPoint: {
              latitude: tasks[i].latitude,
              longitude: tasks[i].longitude,
            },
            endPoint: {
              latitude: tasks[j].latitude,
              longitude: tasks[j].longitude,
            },
          });

          cache.push({
            startId: tasks[i].id,
            endId: tasks[j].id,
            distance,
          });
        } catch (error) {
          console.error(error);
        }
      }
    }

    await fs.writeFile('./_cache', JSON.stringify(cache));

    res.json(cache);
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

app.get('/cvrp', async (req, res) => {
  try {
    const depot = {
      id: -1,
      latitude: 55.746081,
      longitude: 37.887085,
      demand: 0,
    };

    const tasks = await prisma.task.findMany();

    if (!tasks.length) {
      return;
    }

    tasks.unshift(depot);

    let cache: {
      startId: number;
      endId: number;
      distance: number;
    }[] = [];

    notify('Getting cache');

    try {
      const buffer = await fs.readFile('./_cache');

      let data = buffer.toString().trim();

      if (data.length) {
        cache = JSON.parse(data);
      }
    } catch (error) {
      console.error(error);

      notify(error);

      throw new Error('Cache file was not found or corrupted');
    }

    notify('Cache found');

    const distancesMatrix: number[][] = [];

    const nodesMap: Record<string, number> = {};

    const demands: number[] = [];

    for (let i = 0; i < tasks.length; i++) {
      if (
        tasks[i].latitude &&
        tasks[i].longitude &&
        (tasks[i].demand || tasks[i].id === -1)
      ) {
        if (
          !cache.some(
            (data) => data.startId == tasks[i].id || data.endId == tasks[i].id
          )
        ) {
          // Task was not found inside cache
          console.log(`Path was not found for task with id: ${tasks[i].id}`);
          continue;
        }

        // row structure: [endForSome,endForSome,0,startForSome,startForSome]

        const end = cache
          .filter((data) => data.endId == tasks[i].id)
          .map((data) => data.distance);
        const start = cache
          .filter((data) => data.startId == tasks[i].id)
          .map((data) => data.distance);

        const row = [...end, 0, ...start];

        nodesMap[i] = tasks[i].id;

        distancesMatrix.push(row);

        demands.push(tasks[i].demand);
      }
    }

    //! TODO: На оч больших capacity алгоритм ломается ?????
    const problem: ProblemType = {
      author: '',
      name: '',
      type: 'unique',
      edgeWeightType: 'unique',
      distancesMatrix,
      coords: [],
      demands,
      capacity: 18000,
      dimension: distancesMatrix.length,
      trucks: 5,
      optimal: Infinity,
    };

    notify('Bee clarke started');

    const beeClarke = await bee({ problem, useClarke: true });

    notify('Bee clarke ended');

    const mappedSolution = beeClarke.map((i) =>
      nodesMap[i] == -1 ? 0 : nodesMap[i]
    );

    const solution = getSolutionRoutesFlat({ solution: mappedSolution });

    checkDepotsPlacement({
      routes: solution,
      isNotMuted: true,
    });

    checkAllLocationsVisitedOnce({
      routes: solution,
      // locations: tasks.map((_, i) => i).filter((i) => i !== 0),
      locations: tasks.map((task) => task.id).filter((i) => i != -1),
      isNotMuted: true,
    });

    // checkCapacity({
    //   routes: solution,
    //   capacity: problem.capacity,
    //   demands,
    //   isNotMuted: true,
    // });

    const _beeClarkeCost = getSolutionTotalDistanceFlat({
      solution: beeClarke,
      distancesMatrix: problem.distancesMatrix,
    });

    const mappedLocations = solution.map((path) =>
      path.map((id) => {
        const task = tasks.find((task) => task.id == (id == 0 ? -1 : id));

        return {
          longitude: task ? task.longitude : null,
          latitude: task ? task.latitude : null,
        };
      })
    );

    // res.send({
    //   solution: solution,
    //   locations: mappedLocations,
    //   cost: _beeClarkeCost,
    //   capacity: problem.capacity,
    //   trucks: problem.trucks,
    //   iteration: 300,
    // });

    res.send(mappedLocations);
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

export { prisma, app };
