/*
  Warnings:

  - You are about to drop the `ChallengeResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChallengeResponse" DROP CONSTRAINT "ChallengeResponse_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropTable
DROP TABLE "ChallengeResponse";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "challenge_response" (
    "full_nonce" VARCHAR(16) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "challenge_resmagang_teleakses=# select * from "user";
 id | username |     salt     |                         salted_password                          
----+----------+--------------+------------------------------------------------------------------
  1 | testuser | passwordsalt | 9cdcff1121b428e3378f4bea7f58b9a76989e2dc0aa3adb038ff7d00132f5726
(1 row)

ponse" VARCHAR(128) NOT NULL,

    CONSTRAINT "challenge_response_pkey" PRIMARY KEY ("full_nonce")
);

-- CreateTable
CREATE TABLE "session" (
    "session_id" VARCHAR(16) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "session_secret" VARCHAR(128) NOT NULL,
    "tstamp" BIGINT NOT NULL,
    "st" INTEGER NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" BIGSERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "salted_password" TEXT NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenge_response_user_id_idx" ON "challenge_response"("user_id");

-- CreateIndex
CREATE INDEX "user_id_index" ON "session"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- AddForeignKey
ALTER TABLE "challenge_response" ADD CONSTRAINT "challenge_response_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
