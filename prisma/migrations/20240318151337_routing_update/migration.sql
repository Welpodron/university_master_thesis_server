/*
  Warnings:

  - The primary key for the `Routing` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `endTaskId` on the `Routing` table. All the data in the column will be lost.
  - You are about to drop the column `startTaskId` on the `Routing` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Routing" (
    "id" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "startCoords" TEXT NOT NULL,
    "endCoords" TEXT NOT NULL,
    "manual" BOOLEAN NOT NULL,
    "pathCoords" TEXT,

    PRIMARY KEY ("startCoords", "endCoords")
);
INSERT INTO "new_Routing" ("distance", "duration", "endCoords", "id", "manual", "pathCoords", "startCoords") SELECT "distance", "duration", "endCoords", "id", "manual", "pathCoords", "startCoords" FROM "Routing";
DROP TABLE "Routing";
ALTER TABLE "new_Routing" RENAME TO "Routing";
CREATE UNIQUE INDEX "Routing_id_key" ON "Routing"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
