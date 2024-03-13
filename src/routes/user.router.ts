import express from 'express';

import { object, string } from 'yup';

import DB from '../db';
import Mail from '../mail';
import { auth } from '../middlewares/auth';
import { USER_ROLES } from '../constants';

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

userRouter.get('/users', auth(USER_ROLES.MANAGER), async (req, res) => {
  try {
    const users = await DB.user.findMany();

    res.json(users.map((user) => ({ id: user.id, name: user.name })));
  } catch (error) {
    res.status(500).json((error as Error).message);
  }
});

userRouter.post('/users', async (req, res) => {
  try {
    const { name, email } = await userCreationSchema.validate(req.body);

    const user = await DB.user.create({
      data: {
        name,
        email,
        pass: '123',
        role: USER_ROLES.DRIVER,
      },
    });

    await Mail.sendMail({
      from: process.env.MAIL_SMTP_USER,
      to: email,
      subject: 'Hello ✔',
      html: `<b>login: ${email} pass: 123</b>`,
    });

    res.json({ id: user.id });
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
