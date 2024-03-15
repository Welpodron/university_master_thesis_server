import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import DB from '../../db';

import { ValidationError } from 'yup';
import type { Schema } from 'yup';

export const create =
  (name: keyof typeof DB, schema: Schema): RequestHandler =>
  async (req, res) => {
    try {
      const data = await schema.validate(req.body);

      console.log(data);

      const result = await (DB[name] as any).create({
        data,
      });

      res.json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(StatusCodes.BAD_REQUEST).json((error as Error).message);
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json((error as Error).message);
      }
    }
  };
