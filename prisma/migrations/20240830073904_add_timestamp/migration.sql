/*
  Warnings:

  - You are about to drop the column `tstamp` on the `session` table. All the data in the column will be lost.
  - Added the required column `timestamp ` to the `challenge_response` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timestamp ` to the `session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "challenge_response" ADD COLUMN     "timestamp " BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "session" DROP COLUMN "tstamp",
ADD COLUMN     "timestamp " BIGINT NOT NULL;
