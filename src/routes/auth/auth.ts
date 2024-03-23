import express from 'express';

import { object, string } from 'yup';
import { compare } from 'bcrypt';
import { DB } from '../../db';
import { Tokenizer } from '../../tokenizer';
import { refresh, auth } from '../../middlewares';

export const authRouter = express.Router();

const authLoginSchema = object({
  email: string().email().required(),
  pass: string().required(),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    let isSet = false;

    if (req.cookies && req.cookies.refreshToken) {
      try {
        const token = String(req.cookies.refreshToken);

        const decoded = Tokenizer.verify({
          token,
          secret: String(process.env.JWT_REFRESH_SECRET),
        });

        if (
          decoded != null &&
          typeof decoded === 'object' &&
          decoded.id &&
          decoded.role
        ) {
          const tokens = Tokenizer.generate({
            id: decoded.id,
            role: decoded.role,
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

          // console.log('refreshToken was found');

          // accessToken MUST STORE IN MEMORY INSIDE CLIENT
          res.json({
            id: decoded.id,
            role: decoded.role,
            token: tokens.accessToken.value,
          });

          isSet = true;
        }
      } catch (error) {
        console.error(error);
      }
    }

    if (!isSet) {
      console.log('switching to standard auth protocol');

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
        id: user.id,
        role: user.role,
        token: tokens.accessToken.value,
      });
    }
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

authRouter.get('/logout', refresh, async (req, res) => {
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
      id: (req as Record<string, any>).user.id,
      role: (req as Record<string, any>).user.role,
      token: tokens.accessToken.value,
    });
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});

authRouter.post('/verify', auth(), refresh, async (req, res) => {
  try {
    if ((req as Record<string, any>).user) {
      res.json({
        id: (req as Record<string, any>).user.id,
        role: (req as Record<string, any>).user.role,
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    res.status(400).json((error as Error).message);
  }
});
