-- CreateTable
CREATE TABLE "BetaUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT DEFAULT 'reddit',
    "status" TEXT NOT NULL DEFAULT 'invited',
    "redeemedAt" TIMESTAMP(3),
    "redeemedUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BetaUser_email_key" ON "BetaUser"("email");

-- CreateIndex
CREATE INDEX "BetaUser_email_idx" ON "BetaUser"("email");

-- CreateIndex
CREATE INDEX "BetaUser_status_idx" ON "BetaUser"("status");
