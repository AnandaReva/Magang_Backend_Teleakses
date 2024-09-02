/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `challenge_response` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `session` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "challenge_response_user_id_key" ON "challenge_response"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_user_id_key" ON "session"("user_id");
