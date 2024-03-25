import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { DB, _models } from '../../db';

export const readOne =
  (model: keyof typeof DB): RequestHandler =>
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await (DB[model] as any).findFirst({
        where: {
          id: Number(id),
        },
      });

      if (result) {
        delete result['pass'];
      }

      res.json(result);
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json((error as Error).message);
    }
  };
