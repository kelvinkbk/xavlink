-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "colorPalette" TEXT NOT NULL DEFAULT 'champagne',
ALTER COLUMN "theme" SET DEFAULT 'dark';
