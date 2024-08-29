-- CreateTable
CREATE TABLE "challenge_response" (
    "full_nonce" VARCHAR(16) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "challenge_response" VARCHAR(128) NOT NULL,

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
    "fullname" TEXT NOT NULL,
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
