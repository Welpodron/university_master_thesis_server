/*
  Warnings:

  - You are about to drop the column `completed` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `Task` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "longitude" REAL NOT NULL,
    "latitude" REAL NOT NULL,
    "demand" INTEGER NOT NULL,
    "assigned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" DATETIME,
    "assignmentId" INTEGER,
    CONSTRAINT "Task_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("createdAt", "demand", "id", "latitude", "longitude") SELECT "createdAt", "demand", "id", "latitude", "longitude" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
