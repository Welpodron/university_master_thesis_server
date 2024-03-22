-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "depotLocation" TEXT NOT NULL DEFAULT '[]',
    "routingKey" TEXT NOT NULL DEFAULT '',
    "routingAlgo" TEXT NOT NULL DEFAULT 'ABC_CLARKE',
    "routingAlgoIterations" INTEGER NOT NULL DEFAULT 500
);
INSERT INTO "new_Settings" ("depotLocation", "id", "routingAlgo", "routingAlgoIterations") SELECT "depotLocation", "id", "routingAlgo", "routingAlgoIterations" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
