-- AlterTable: add gi/nogi/kids columns with safe defaults
ALTER TABLE "Competition" ADD COLUMN "gi"   BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE "Competition" ADD COLUMN "nogi" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "Competition" ADD COLUMN "kids" BOOLEAN NOT NULL DEFAULT 0;
