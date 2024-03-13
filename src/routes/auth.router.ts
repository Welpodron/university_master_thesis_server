import express, { Request } from 'express';

import { object, string } from 'yup';

import DB from '../db';
import Tokenizer from '../tokenizer';
import { compare } from 'bcrypt';
import { refresh } from '../middlewares/refresh';

export const authRouter = express.Router();

const authLoginSchema = object({
  email: string().email().required(),
  pass: string().required(),
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, pass } = await authLoginSchema.validate(req.body);

    const user = await DB.user.findUnique({
      where: {
        email,
      },
    });

    if (user == null) {
      throw new Error('Введенный email или пароль не являются валидными');
    }

    const isPassMatch = await compare(pass, user.pass);

    if (!isPassMatch) {
      throw new Error('Введенный email или пароль не являются валидными');
    }

    const tokens = Tokenizer.generate({ id: user.id, role: user.role });

    await DB.session.create({
      data: {
        refreshToken: tokens.refreshToken.value,
        expiresAt: tokens.refreshToken.expirationDate,
      },
    });

    // MUST BE IN cookie ONLY
    res.cookie('refreshToken', tokens.refreshToken.value, {
      maxAge: tokens.refreshToken.maxAge,
      httpOnly: true,
    });

    // accessToken MUST STORE IN MEMORY INSIDE CLIENT
    res.json({
      accessToken: tokens.accessToken.value,
    });
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

authRouter.post('/logout', refresh, async (req, res) => {
  try {
    await DB.session.delete({
      where: {
        refreshToken: req.cookies.refreshToken,
      },
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
    });

    res.json(true);
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

authRouter.post('/refresh', refresh, async (req, res) => {
  try {
    const tokens = Tokenizer.generate({
      id: (req as Record<string, any>).user.id,
      role: (req as Record<string, any>).user.role,
    });

    await DB.session.update({
      where: {
        refreshToken: req.cookies.refreshToken,
      },
      data: {
        refreshToken: tokens.refreshToken.value,
        expiresAt: tokens.refreshToken.expirationDate,
      },
    });

    // MUST BE IN cookie ONLY
    res.cookie('refreshToken', tokens.refreshToken.value, {
      maxAge: tokens.refreshToken.maxAge,
      httpOnly: true,
    });

    // accessToken MUST STORE IN MEMORY INSIDE CLIENT
    res.json({
      accessToken: tokens.accessToken.value,
    });
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});
