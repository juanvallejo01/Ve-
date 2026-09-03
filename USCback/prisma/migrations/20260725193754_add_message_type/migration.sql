-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'SCREENSHOT_ALERT');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'TEXT';
