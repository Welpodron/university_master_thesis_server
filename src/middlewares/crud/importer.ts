import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { DB } from '../../db';

import { ValidationError } from 'yup';
import type { Schema } from 'yup';

import { v4 as uuidv4 } from 'uuid';

export const importer =
  (model: keyof typeof DB, schema: Schema): RequestHandler =>
  async (req, res) => {
    try {
      const { importedData } = req.body;

      if (!Array.isArray(importedData) || !importedData.length) {
        throw new ValidationError('Ожидался не пустой JSON список данных');
      }

      for (const obj of importedData) {
        try {
          const data = await schema.validate(obj);

          if (data) {
            delete data['id'];
            delete data['pass'];
          }

          if (model == 'routing') {
            data['id'] = uuidv4();
          }

          await (DB[model] as any).create({
            data,
          });
        } catch (error) {
          console.log(error);
        }
      }

      res.json(true);
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
