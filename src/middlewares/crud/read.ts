import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import DB from '../../db';

export const read =
  (name: keyof typeof DB): RequestHandler =>
  async (req, res) => {
    try {
      const data = await (DB[name] as any).findMany();

      res.json(data);
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json((error as Error).message);
    }
  };
