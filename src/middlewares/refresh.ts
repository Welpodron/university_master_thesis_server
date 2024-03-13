import { RequestHandler } from 'express';

import Tokenizer from '../tokenizer';

export const refresh: RequestHandler = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.refreshToken) {
    try {
      token = String(req.cookies.refreshToken);

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
        (req as Record<string, any>).user = {
          id: decoded.id,
          role: decoded.role,
        };

        next();
      }
    } catch (error) {
      res.status(403).json((error as Error).message);
    }
  }

  if (!token) {
    res
      .status(401)
      .json('Не предоставлен токен обновления или же он не является валидным');
  }
};
