import express from 'express';

import { object, string } from 'yup';

import { Mailer } from '../../mailer';
import { USER_ROLES } from '../../constants';
import { DB, _models } from '../../db';
import { auth, remove } from '../../middlewares';
import { generatePassword } from '../../utils/utils';

const MODEL = 'user';
const BASE_URL = `${MODEL}s`;

export const router = express.Router();

export const creationSchema = object({
  name: string().required().min(3),
  email: string().email().required(),
});

export const updateSchema = object({
  pass: string(),
  name: string().min(3),
  email: string().email(),
});

router.get(`/${BASE_URL}`, auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const _fields =
      _models.find(
        (_model) =>
          _model.name ===
          (MODEL as string).charAt(0).toUpperCase() + (MODEL as string).slice(1)
      )?.fields ?? [];

    const _tree: Record<string, any> = {};

    for (const _field of _fields) {
      if (_field.name === 'pass' || _field.name === 'role') {
        continue;
      }
      _tree[_field.name] = _field;
    }

    const users = await DB.user.findMany();

    res.json({
      data: users.map((user) => ({ id: user.id, name: user.name })),
      model: _tree,
    });
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

router.post(`/${BASE_URL}`, auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const { name, email } = await creationSchema.validate(req.body);

    const pass = generatePassword();

    const user = await DB.user.create({
      data: {
        name,
        email,
        pass,
        role: USER_ROLES.DRIVER,
      },
    });

    try {
      await Mailer.sendMail({
        from: process.env.MAIL_SMTP_USER,
        to: email,
        subject: 'Регистрация в системе',
        html: `<b>Логин: ${email} Пароль: ${pass}</b>`,
      });
    } catch (error) {
      console.log(error);
    }

    res.json({ id: user.id, name: user.name });
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

router.put(`/${BASE_URL}/:id`, auth(), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id != (req as Record<string, any>).user.id) {
      throw new Error('Не достаточно прав для совершения данной операции');
    }

    const { pass, name, email } = await updateSchema.validate(req.body);

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

router.delete(`/${BASE_URL}`, auth(USER_ROLES.MANAGER), remove(MODEL));
