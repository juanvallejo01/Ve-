-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "userAEphemeral" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userBEphemeral" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "messages_expiresAt_idx" ON "messages"("expiresAt");
