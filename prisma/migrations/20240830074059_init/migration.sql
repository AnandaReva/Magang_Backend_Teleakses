/*
  Warnings:

  - You are about to drop the column `timestamp ` on the `challenge_response` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp ` on the `session` table. All the data in the column will be lost.
  - Added the required column `tstamp` to the `challenge_response` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tstamp` to the `session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "challenge_response" DROP COLUMN "timestamp ",
ADD COLUMN     "tstamp" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "session" DROP COLUMN "timestamp ",
ADD COLUMN     "tstamp" BIGINT NOT NULL;
