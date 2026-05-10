-- Allow bonuses without a client link until one is available.
ALTER TABLE "bonuses" ALTER COLUMN "clientLink" DROP NOT NULL;
