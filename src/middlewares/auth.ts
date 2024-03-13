import { RequestHandler } from 'express';

import Tokenizer from '../tokenizer';

export const auth =
  (role?: string): RequestHandler =>
  async (req, res, next) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      try {
        token = String(req.headers.authorization.split(' ')[1]);

        const decoded = Tokenizer.verify({
          token,
          secret: String(process.env.JWT_ACCESS_SECRET),
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

          if (role != null) {
            if (role === decoded.role) {
              next();
            } else {
              res
                .status(403)
                .json('Не достаточно прав для совершения данной операции');
            }
          } else {
            next();
          }
        }
      } catch (error) {
        res.status(403).json((error as Error).message);
      }
    }

    if (!token) {
      res
        .status(403)
        .json(
          'Не предоставлен токен авторизации или же он не является валидным'
        );
    }
  };
