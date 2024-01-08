-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "longitude" REAL NOT NULL,
    "latitude" REAL NOT NULL,
    "demand" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Transport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "capacity" INTEGER NOT NULL
);
