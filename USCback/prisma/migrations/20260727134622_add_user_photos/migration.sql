-- AlterTable
ALTER TABLE "users" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
