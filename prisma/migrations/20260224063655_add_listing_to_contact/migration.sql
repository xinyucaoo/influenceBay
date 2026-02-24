-- AlterTable
ALTER TABLE "ContactRequest" ADD COLUMN     "listingId" TEXT;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SponsorshipListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
