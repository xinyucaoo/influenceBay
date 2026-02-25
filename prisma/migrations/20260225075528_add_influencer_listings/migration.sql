-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'OUTBID');

-- CreateTable
CREATE TABLE "InfluencerListing" (
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

    CONSTRAINT "InfluencerListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingBid" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InfluencerListingNiches" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InfluencerListingNiches_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_InfluencerListingNiches_B_index" ON "_InfluencerListingNiches"("B");

-- AddForeignKey
ALTER TABLE "InfluencerListing" ADD CONSTRAINT "InfluencerListing_influencerProfileId_fkey" FOREIGN KEY ("influencerProfileId") REFERENCES "InfluencerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingBid" ADD CONSTRAINT "ListingBid_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "InfluencerListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingBid" ADD CONSTRAINT "ListingBid_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InfluencerListingNiches" ADD CONSTRAINT "_InfluencerListingNiches_A_fkey" FOREIGN KEY ("A") REFERENCES "InfluencerListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InfluencerListingNiches" ADD CONSTRAINT "_InfluencerListingNiches_B_fkey" FOREIGN KEY ("B") REFERENCES "Niche"("id") ON DELETE CASCADE ON UPDATE CASCADE;
