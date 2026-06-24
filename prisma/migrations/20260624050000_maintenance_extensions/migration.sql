-- MNT-2/3/5/6/7: extend MaintenanceTicket and add TicketFeedback

-- AlterTable: new ticket columns. ticketNo is added nullable first so existing
-- rows can be backfilled before the NOT NULL + UNIQUE constraints are applied.
ALTER TABLE "MaintenanceTicket"
  ADD COLUMN "ticketNo" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "building" TEXT,
  ADD COLUMN "roomNumber" TEXT,
  ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "slaDueAt" TIMESTAMP(3),
  ADD COLUMN "slaBreached" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reopenRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reopenReason" TEXT;

-- Backfill a human-readable reference for any pre-existing tickets.
UPDATE "MaintenanceTicket"
  SET "ticketNo" = 'MNT-' || UPPER(SUBSTRING("id" FROM 1 FOR 8))
  WHERE "ticketNo" IS NULL;

ALTER TABLE "MaintenanceTicket" ALTER COLUMN "ticketNo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTicket_ticketNo_key" ON "MaintenanceTicket"("ticketNo");

-- CreateTable
CREATE TABLE "TicketFeedback" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketFeedback_ticketId_key" ON "TicketFeedback"("ticketId");

-- AddForeignKey
ALTER TABLE "TicketFeedback" ADD CONSTRAINT "TicketFeedback_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "MaintenanceTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
