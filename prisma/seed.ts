import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TASKS = [
  {
    latitude: 55.774762,
    longitude: 37.846722,
    demand: 1612,
  },
  {
    latitude: 55.77162,
    longitude: 37.847031,
    demand: 1566,
  },
  {
    latitude: 55.769662,
    longitude: 37.85343,
    demand: 1601,
  },
  {
    latitude: 55.767677,
    longitude: 37.847858,
    demand: 1573,
  },
  {
    latitude: 55.768794,
    longitude: 37.858787,
    demand: 1595,
  },
  {
    latitude: 55.76745,
    longitude: 37.850834,
    demand: 1564,
  },
  {
    latitude: 55.764789,
    longitude: 37.855195,
    demand: 1560,
  },
  {
    latitude: 55.765731,
    longitude: 37.865175,
    demand: 1584,
  },
  {
    latitude: 55.761472,
    longitude: 37.847532,
    demand: 1627,
  },
  {
    latitude: 55.760169,
    longitude: 37.856089,
    demand: 1583,
  },
  {
    latitude: 55.762382,
    longitude: 37.862256,
    demand: 1624,
  },
  {
    latitude: 55.762445,
    longitude: 37.863802,
    demand: 1628,
  },
  {
    latitude: 55.758389,
    longitude: 37.850658,
    demand: 1558,
  },
  {
    latitude: 55.758563,
    longitude: 37.855582,
    demand: 1597,
  },
  {
    latitude: 55.757593,
    longitude: 37.860526,
    demand: 1609,
  },
  {
    latitude: 55.75585,
    longitude: 37.856888,
    demand: 1549,
  },
  {
    latitude: 55.749126,
    longitude: 37.848659,
    demand: 1617,
  },
  {
    latitude: 55.750285,
    longitude: 37.853521,
    demand: 1619,
  },
  {
    latitude: 55.752922,
    longitude: 37.869752,
    demand: 1567,
  },
  {
    latitude: 55.753781,
    longitude: 37.872805,
    demand: 1566,
  },
  {
    latitude: 55.754701,
    longitude: 37.880408,
    demand: 1595,
  },
  {
    latitude: 55.756315,
    longitude: 37.885441,
    demand: 1579,
  },
  {
    latitude: 55.752159,
    longitude: 37.873685,
    demand: 1529,
  },
  {
    latitude: 55.754395,
    longitude: 37.88651,
    demand: 1622,
  },
  {
    latitude: 55.74677,
    longitude: 37.852733,
    demand: 1599,
  },
  {
    latitude: 55.746986,
    longitude: 37.857921,
    demand: 1664,
  },
  {
    latitude: 55.746963,
    longitude: 37.863387,
    demand: 1541,
  },
  {
    latitude: 55.749446,
    longitude: 37.865004,
    demand: 1569,
  },
  {
    latitude: 55.750276,
    longitude: 37.872247,
    demand: 1556,
  },
  {
    latitude: 55.752216,
    longitude: 37.879561,
    demand: 1593,
  },
  {
    latitude: 55.749098,
    longitude: 37.877494,
    demand: 1530,
  },
  {
    latitude: 55.746474,
    longitude: 37.877333,
    demand: 1598,
  },
  {
    latitude: 55.745029,
    longitude: 37.871167,
    demand: 1610,
  },
  {
    latitude: 55.74337,
    longitude: 37.861483,
    demand: 1576,
  },
  {
    latitude: 55.743053,
    longitude: 37.852937,
    demand: 1613,
  },
  {
    latitude: 55.743854,
    longitude: 37.874554,
    demand: 1587,
  },
  {
    latitude: 55.74188,
    longitude: 37.870239,
    demand: 1609,
  },
  {
    latitude: 55.738747,
    longitude: 37.86863,
    demand: 1601,
  },
  {
    latitude: 55.73981,
    longitude: 37.866541,
    demand: 1598,
  },
  {
    latitude: 55.735761,
    longitude: 37.863494,
    demand: 1573,
  },
  {
    latitude: 55.731992,
    longitude: 37.860324,
    demand: 1601,
  },
  {
    latitude: 55.73146,
    longitude: 37.855563,
    demand: 1615,
  },
  {
    latitude: 55.731524,
    longitude: 37.853607,
    demand: 1612,
  },
  {
    latitude: 55.7344,
    longitude: 37.853,
    demand: 1556,
  },
  {
    latitude: 55.736665,
    longitude: 37.846752,
    demand: 1624,
  },
  {
    latitude: 55.740413,
    longitude: 37.848078,
    demand: 1555,
  },
  {
    latitude: 55.737835,
    longitude: 37.85055,
    demand: 1598,
  },
  {
    latitude: 55.739018,
    longitude: 37.855942,
    demand: 1547,
  },
  {
    latitude: 55.739691,
    longitude: 37.854044,
    demand: 1602,
  },
  {
    latitude: 55.740896,
    longitude: 37.851524,
    demand: 1563,
  },
];

const main = async () => {
  console.log({
    message: 'Инициализация базы данных...',
    code: 'DATABASE_SEEDING_INFO',
  });

  for (const task of DEFAULT_TASKS) {
    const _task = await prisma.task.create({
      data: task,
    });

    console.log({
      message: `Создана запись в таблице Task с id: ${_task.id}`,
      code: 'DATABASE_SEEDING_INFO',
    });
  }

  console.log({
    message: 'Конец инициализации базы данных',
    code: 'DATABASE_SEEDING_INFO',
  });
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.log({ message: e, code: 'DATABASE_SEEDING_ERROR' });

    await prisma.$disconnect();

    process.exit(1);
  });
