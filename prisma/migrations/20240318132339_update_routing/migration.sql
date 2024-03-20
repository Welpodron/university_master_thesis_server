/*
  Warnings:

  - Added the required column `duration` to the `Routing` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Routing" (
    "id" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "startTaskId" INTEGER NOT NULL,
    "endTaskId" INTEGER NOT NULL,
    "startCoords" TEXT NOT NULL,
    "endCoords" TEXT NOT NULL,
    "manual" BOOLEAN NOT NULL,
    "pathCoords" TEXT,

    PRIMARY KEY ("startTaskId", "endTaskId")
);
INSERT INTO "new_Routing" ("distance", "endCoords", "endTaskId", "id", "manual", "startCoords", "startTaskId") SELECT "distance", "endCoords", "endTaskId", "id", "manual", "startCoords", "startTaskId" FROM "Routing";
DROP TABLE "Routing";
ALTER TABLE "new_Routing" RENAME TO "Routing";
CREATE UNIQUE INDEX "Routing_id_key" ON "Routing"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
