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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("startCoords", "endCoords")
);
INSERT INTO "new_Routing" ("distance", "duration", "endCoords", "id", "manual", "pathCoords", "startCoords") SELECT "distance", "duration", "endCoords", "id", "manual", "pathCoords", "startCoords" FROM "Routing";
DROP TABLE "Routing";
ALTER TABLE "new_Routing" RENAME TO "Routing";
CREATE UNIQUE INDEX "Routing_id_key" ON "Routing"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
