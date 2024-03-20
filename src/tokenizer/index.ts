import { sign, verify } from 'jsonwebtoken';
import ms from 'ms';

class _Tokenizer {
  generate(payload: object) {
    const accessTokenMaxAgeMs = ms(String(process.env.JWT_ACCESS_EXPIRES_IN));
    const refreshTokenMaxAgeMs = ms(String(process.env.JWT_REFRESH_EXPIRES_IN));

    const accessTokenExpirationDate = new Date(
      Date.now() + accessTokenMaxAgeMs
    );
    const refreshTokenExpirationDate = new Date(
      Date.now() + refreshTokenMaxAgeMs
    );

    const accessToken = sign(payload, String(process.env.JWT_ACCESS_SECRET), {
      expiresIn: accessTokenMaxAgeMs,
    });
    const refreshToken = sign(payload, String(process.env.JWT_REFRESH_SECRET), {
      expiresIn: refreshTokenMaxAgeMs,
    });

    return {
      accessToken: {
        value: accessToken,
        maxAge: accessTokenMaxAgeMs,
        expirationDate: accessTokenExpirationDate,
      },
      refreshToken: {
        value: refreshToken,
        maxAge: refreshTokenMaxAgeMs,
        expirationDate: refreshTokenExpirationDate,
      },
    };
  }

  verify({ token, secret }: { token: string; secret: string }) {
    return verify(token, secret);
  }
}

export const Tokenizer = new _Tokenizer();
