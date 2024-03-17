import DB, { _models } from '../../../db';

export const read =
  (
    model: keyof typeof DB,
    onSuccess: (data: any, model: any) => void,
    onError?: (error: any) => void
  ) =>
  async () => {
    try {
      const data = await (DB[model] as any).findMany();

      const _fields =
        _models.find(
          (_model) =>
            _model.name ===
            (model as string).charAt(0).toUpperCase() +
              (model as string).slice(1)
        )?.fields ?? [];

      const _tree: Record<string, any> = {};

      for (const _field of _fields) {
        _tree[_field.name] = _field;
      }

      onSuccess(data, _tree);
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error(error);
      }
    }
  };
