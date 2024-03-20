import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ValidationError } from 'yup';
import { DB } from '../../db';

export const remove =
  (model: keyof typeof DB): RequestHandler =>
  async (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || !ids.length) {
        throw new ValidationError('Ожидался не пустой список идентификаторов');
      }

      const _ids: number[] = [];

      ids.forEach((id: string) => {
        const _id = parseInt(id);
        if (model == 'user') {
          if (_id == (req as Record<string, any>).user.id) {
            return;
          }
        }
        if (isNaN(_id) || _id <= 0) {
          return;
        }
        _ids.push(_id);
      });

      if (!_ids.length) {
        throw new ValidationError('Ожидался не пустой список идентификаторов');
      }

      const result = await (DB[model] as any).deleteMany({
        where: {
          id: {
            in: _ids,
          },
        },
      });

      res.json(_ids);
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
