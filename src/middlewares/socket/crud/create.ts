import { Schema } from 'yup';
import { DB } from '../../../db';

export const create =
  (
    model: keyof typeof DB,
    schema: Schema,
    onSuccess: (data: any) => void,
    onError?: (error: any) => void
  ) =>
  async (data: any) => {
    try {
      const _data = await schema.validate(data);

      const result = await (DB[model] as any).create({
        data: _data,
      });

      onSuccess(result);
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error(error);
      }
    }
  };
