import express from 'express';

import { USER_ROLES } from '../../constants';
import DB, { _models } from '../../db';
import { auth } from '../../middlewares';

export const assignmentRouter = express.Router();

assignmentRouter.get(
  '/_assignmentsModel',
  auth(USER_ROLES.MANAGER),
  async (req, res) => {
    try {
      const _fields =
        _models.find((model) => model.name === 'Assignment')?.fields ?? [];

      const _tree: Record<string, any> = {};

      for (const _field of _fields) {
        _tree[_field.name] = _field;
      }

      res.json(_tree);
    } catch (error) {
      res.status(500).json((error as Error).message);
    }
  }
);

assignmentRouter.get(
  '/assignments',
  auth(USER_ROLES.MANAGER),
  async (req, res) => {
    try {
      //   const userId = 1;
      //   const vehicleId = 2;
      //   //   const tasksIds = [56, 53, 50, 49];
      //   const assignment = await DB.assignment.create({
      //     data: {
      //       userId,
      //       vehicleId,
      //       tasks: {
      //         connect: [{ id: 56 }, { id: 53 }, { id: 50 }, { id: 49 }],
      //       },
      //     },
      //   });
      const assignments = await DB.assignment.findMany({
        include: {
          tasks: true,
        },
      });

      res.json(assignments);
      //   res.json([]);
    } catch (error) {
      res.status(500).json((error as Error).message);
    }
  }
);
