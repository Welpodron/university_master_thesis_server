import express from 'express';

import { object, string } from 'yup';

import { randomFillSync } from 'crypto';
import Mail from '../../mail';
import { USER_ROLES } from '../../constants';
import DB, { _models } from '../../db';
import { auth } from '../../middlewares';

const generatePassword = (
  length = 20,
  characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
) =>
  Array.from(randomFillSync(new Uint32Array(length)))
    .map((x) => characters[x % characters.length])
    .join('');

export const userRouter = express.Router();

const userCreationSchema = object({
  name: string().required().min(3),
  email: string().email().required(),
});

const userUpdateSchema = object({
  pass: string(),
  name: string().min(3),
  email: string().email(),
});

userRouter.get('/_usersModel', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const _fields =
      _models.find((model) => model.name === 'User')?.fields ?? [];

    const _tree: Record<string, any> = {};

    for (const _field of _fields) {
      if (_field.name === 'pass' || _field.name === 'role') {
        continue;
      }
      _tree[_field.name] = _field;
    }

    res.json(_tree);
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

userRouter.get('/users', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const users = await DB.user.findMany();

    res.json(users.map((user) => ({ id: user.id, name: user.name })));
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

userRouter.post('/users', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const { name, email } = await userCreationSchema.validate(req.body);

    const pass = generatePassword();

    const user = await DB.user.create({
      data: {
        name,
        email,
        pass,
        role: USER_ROLES.DRIVER,
      },
    });

    await Mail.sendMail({
      from: process.env.MAIL_SMTP_USER,
      to: email,
      subject: 'Hello ✔',
      html: `<b>login: ${email} pass: ${pass}</b>`,
    });

    res.json({ id: user.id, name: user.name });
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

userRouter.put('/users/:id', auth(), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id != (req as Record<string, any>).user.id) {
      throw new Error('Не достаточно прав для совершения данной операции');
    }

    const { pass, name, email } = await userUpdateSchema.validate(req.body);

    const user = await DB.user.update({
      where: {
        id: Number(id),
      },
      data: {
        ...(pass != null && { pass }),
        ...(name != null && { name }),
        ...(email != null && { email }),
      },
    });

    res.json(user);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

userRouter.delete('/users', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      throw new Error('Ожидался не пустой список идентификаторов');
    }

    const _ids: number[] = [];

    ids.forEach((id: string) => {
      const _id = parseInt(id);
      if (_id == (req as Record<string, any>).user.id) {
        return;
      }
      if (isNaN(_id) || _id <= 0) {
        return;
      }
      _ids.push(_id);
    });

    if (!_ids.length) {
      throw new Error('Ожидался не пустой список идентификаторов');
    }

    const users = await DB.user.deleteMany({
      where: {
        id: {
          in: _ids,
        },
      },
    });

    res.json(
      (users as unknown as { id: number; name: string }[]).map((user) => ({
        id: user.id,
        name: user.name,
      }))
    );
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});
