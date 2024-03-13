import { PrismaClient } from '@prisma/client';

import { hash } from 'bcrypt';

export default new PrismaClient().$extends({
  query: {
    user: {
      async update({ args, query }) {
        if (args.data && args.data.pass) {
          args.data.pass = await hash(String(args.data.pass), 10);
        }

        return query(args);
      },
      async create({ args, query }) {
        if (args.data && args.data.pass) {
          args.data.pass = await hash(String(args.data.pass), 10);
        }

        return query(args);
      },
    },
  },
});
