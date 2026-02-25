-- Drop dependent data (Offer, ContactRequest listing refs, Message listing refs)
DELETE FROM "Message" WHERE "listingId" IS NOT NULL;
DELETE FROM "Message" WHERE "offerId" IS NOT NULL;
DELETE FROM "Offer";
UPDATE "ContactRequest" SET "listingId" = NULL WHERE "listingId" IS NOT NULL;

-- Drop SponsorshipListing (will recreate with new schema)
DELETE FROM "_ListingNiches";
DELETE FROM "SponsorshipListing";

-- Alter SponsorshipListing: replace influencerProfileId with campaignId
ALTER TABLE "SponsorshipListing" DROP CONSTRAINT IF EXISTS "SponsorshipListing_influencerProfileId_fkey";
ALTER TABLE "SponsorshipListing" DROP COLUMN IF EXISTS "influencerProfileId";
ALTER TABLE "SponsorshipListing" ADD COLUMN "campaignId" TEXT NOT NULL;

ALTER TABLE "SponsorshipListing" ADD CONSTRAINT "SponsorshipListing_campaignId_fkey" 
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Alter Offer: replace brandProfileId with influencerProfileId
ALTER TABLE "Offer" DROP CONSTRAINT IF EXISTS "Offer_brandProfileId_fkey";
ALTER TABLE "Offer" DROP COLUMN IF EXISTS "brandProfileId";
ALTER TABLE "Offer" ADD COLUMN "influencerProfileId" TEXT NOT NULL;

-- Add FK for influencerProfileId (need a placeholder - but we deleted all offers, so no rows)
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_influencerProfileId_fkey" 
  FOREIGN KEY ("influencerProfileId") REFERENCES "InfluencerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
