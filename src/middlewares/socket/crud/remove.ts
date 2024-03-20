import { ValidationError } from 'yup';
import { DB } from '../../../db';

//! TODO: FIX SELF ID REMOVAL FROM USERS
export const remove =
  (
    model: keyof typeof DB,
    onSuccess: (data: any) => void,
    onError?: (error: any) => void
  ) =>
  async (data: any) => {
    try {
      if (!Array.isArray(data) || !data.length) {
        throw new ValidationError('Ожидался не пустой список идентификаторов');
      }

      const _ids: number[] = [];

      data.forEach((id: string) => {
        const _id = parseInt(id);
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

      onSuccess(_ids);
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error(error);
      }
    }
  };
