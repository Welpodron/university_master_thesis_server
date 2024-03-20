/*
  Warnings:

  - Added the required column `manual` to the `Routing` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "depotLocation" TEXT NOT NULL,
    "routingAlgo" TEXT NOT NULL,
    "routingAlgoIterations" INTEGER NOT NULL
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Routing" (
    "id" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "startId" INTEGER NOT NULL,
    "endId" INTEGER NOT NULL,
    "manual" BOOLEAN NOT NULL,

    PRIMARY KEY ("startId", "endId")
);
INSERT INTO "new_Routing" ("distance", "endId", "id", "startId") SELECT "distance", "endId", "id", "startId" FROM "Routing";
DROP TABLE "Routing";
ALTER TABLE "new_Routing" RENAME TO "Routing";
CREATE UNIQUE INDEX "Routing_id_key" ON "Routing"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
