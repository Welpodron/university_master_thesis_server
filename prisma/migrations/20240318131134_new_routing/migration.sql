/*
  Warnings:

  - The primary key for the `Routing` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `endId` on the `Routing` table. All the data in the column will be lost.
  - You are about to drop the column `startId` on the `Routing` table. All the data in the column will be lost.
  - Added the required column `endCoords` to the `Routing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTaskId` to the `Routing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startCoords` to the `Routing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTaskId` to the `Routing` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Routing" (
    "id" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "startTaskId" INTEGER NOT NULL,
    "endTaskId" INTEGER NOT NULL,
    "startCoords" TEXT NOT NULL,
    "endCoords" TEXT NOT NULL,
    "manual" BOOLEAN NOT NULL,

    PRIMARY KEY ("startTaskId", "endTaskId")
);
INSERT INTO "new_Routing" ("distance", "id", "manual") SELECT "distance", "id", "manual" FROM "Routing";
DROP TABLE "Routing";
ALTER TABLE "new_Routing" RENAME TO "Routing";
CREATE UNIQUE INDEX "Routing_id_key" ON "Routing"("id");
CREATE TABLE "new_Vehicle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "additional" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Vehicle" ("capacity", "id", "name") SELECT "capacity", "id", "name" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
