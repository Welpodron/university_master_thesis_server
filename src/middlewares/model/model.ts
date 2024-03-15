import type { RequestHandler } from 'express';
import { _models } from '../../db';

export const model =
  (name: string): RequestHandler =>
  async (req, res) => {
    try {
      const _fields =
        _models.find((model) => model.name === name)?.fields ?? [];

      const _tree: Record<string, any> = {};

      for (const _field of _fields) {
        _tree[_field.name] = _field;
      }

      res.json(_tree);
    } catch (error) {
      res.status(500).json((error as Error).message);
    }
  };
