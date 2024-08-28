-- CreateTable
CREATE TABLE "ChallengeResponse" (
    "fullNonce" VARCHAR(16) NOT NULL,
    "userId" BIGINT NOT NULL,
    "challengeResponse" VARCHAR(128) NOT NULL,

    CONSTRAINT "ChallengeResponse_pkey" PRIMARY KEY ("fullNonce")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionId" VARCHAR(16) NOT NULL,
    "userId" BIGINT NOT NULL,
    "sessionSecret" VARCHAR(128) NOT NULL,
    "tstamp" BIGINT NOT NULL,
    "st" INTEGER NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "saltedPassword" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChallengeResponse_userId_idx" ON "ChallengeResponse"("userId");

-- CreateIndex
CREATE INDEX "userId_index" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "ChallengeResponse" ADD CONSTRAINT "ChallengeResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
