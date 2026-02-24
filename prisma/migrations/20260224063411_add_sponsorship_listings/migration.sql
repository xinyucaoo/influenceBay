-- CreateEnum
CREATE TYPE "ListingPricingType" AS ENUM ('FIXED', 'AUCTION');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('OPEN', 'CLOSED', 'SOLD');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'OUTBID');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "listingId" TEXT,
ADD COLUMN     "offerId" TEXT;

-- CreateTable
CREATE TABLE "SponsorshipListing" (
    "id" TEXT NOT NULL,
    "influencerProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricingType" "ListingPricingType" NOT NULL,
    "fixedPrice" DOUBLE PRECISION,
    "startingBid" DOUBLE PRECISION,
    "reservePrice" DOUBLE PRECISION,
    "auctionEndsAt" TIMESTAMP(3),
    "status" "ListingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorshipListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ListingNiches" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ListingNiches_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ListingNiches_B_index" ON "_ListingNiches"("B");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SponsorshipListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipListing" ADD CONSTRAINT "SponsorshipListing_influencerProfileId_fkey" FOREIGN KEY ("influencerProfileId") REFERENCES "InfluencerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SponsorshipListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListingNiches" ADD CONSTRAINT "_ListingNiches_A_fkey" FOREIGN KEY ("A") REFERENCES "Niche"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ListingNiches" ADD CONSTRAINT "_ListingNiches_B_fkey" FOREIGN KEY ("B") REFERENCES "SponsorshipListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
