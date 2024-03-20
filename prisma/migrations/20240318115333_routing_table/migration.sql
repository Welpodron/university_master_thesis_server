-- CreateTable
CREATE TABLE "Routing" (
    "id" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "startId" INTEGER NOT NULL,
    "endId" INTEGER NOT NULL,

    PRIMARY KEY ("startId", "endId")
);
