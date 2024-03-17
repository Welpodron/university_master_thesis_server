import { Schema } from 'yup';
import DB from '../../../db';

export const update =
  (
    model: keyof typeof DB,
    schema: Schema,
    onSuccess: (data: any) => void,
    onError?: (error: any) => void
  ) =>
  async (data: any) => {
    try {
      const _data = await schema.validate(data);

      const { id } = _data;

      const result = await (DB[model] as any).update({
        where: {
          id: Number(id),
        },
        data,
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
