import type { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { DB, _models } from '../../db';

export const read =
  (model: keyof typeof DB): RequestHandler =>
  async (req, res) => {
    try {
      const _fields =
        _models.find(
          (_model) =>
            _model.name ===
            (model as string).charAt(0).toUpperCase() +
              (model as string).slice(1)
        )?.fields ?? [];

      const _tree: Record<string, any> = {};

      for (const _field of _fields) {
        if (_field.name === 'pass' || _field.name === 'role') {
          continue;
        }
        _tree[_field.name] = _field;
      }

      const result = await (DB[model] as any).findMany();

      res.json({ model: _tree, data: result });
    } catch (error) {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json((error as Error).message);
    }
  };
