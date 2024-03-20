import { randomFillSync } from 'crypto';

export const sleep = ({ ms }: { ms: number }) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(1), ms);
  });
};

export const generatePassword = (
  length = 20,
  characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
) =>
  Array.from(randomFillSync(new Uint32Array(length)))
    .map((x) => characters[x % characters.length])
    .join('');
