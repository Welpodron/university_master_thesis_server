import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { DB } from '../../db';

import { ValidationError, setLocale } from 'yup';
import type { Schema } from 'yup';

export const update =
  (model: keyof typeof DB, schema: Schema): RequestHandler =>
  async (req, res) => {
    try {
      const data = await schema.validate(req.body);

      const { id } = req.params;

      const result = await (DB[model] as any).update({
        where: {
          id: Number(id),
        },
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
