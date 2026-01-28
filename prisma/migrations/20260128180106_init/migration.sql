-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifyToken" TEXT,
    "verifyExpires" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "businessType" TEXT NOT NULL DEFAULT 'ecommerce',
    "ein" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NexusState" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "hasNexus" BOOLEAN NOT NULL DEFAULT false,
    "nexusType" TEXT,
    "registrationNumber" TEXT,
    "registrationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NexusState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calculation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "taxRate" DECIMAL(6,4) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Calculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filing" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "estimatedTax" DECIMAL(12,2),
    "actualTax" DECIMAL(12,2),
    "filedAt" TIMESTAMP(3),
    "confirmationNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRateCache" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "zipCode" TEXT,
    "city" TEXT,
    "combinedRate" DECIMAL(6,4) NOT NULL,
    "stateRate" DECIMAL(6,4) NOT NULL,
    "countyRate" DECIMAL(6,4) NOT NULL,
    "cityRate" DECIMAL(6,4) NOT NULL,
    "specialRate" DECIMAL(6,4) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'taxjar',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxRateCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "messageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailDeadlineReminders" BOOLEAN NOT NULL DEFAULT true,
    "emailWeeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "emailNewRates" BOOLEAN NOT NULL DEFAULT false,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "platformName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpires" TIMESTAMP(3),
    "metadata" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'never',
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformConnectionId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformOrderId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shippingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "customerEmail" TEXT,
    "shippingState" TEXT,
    "shippingCity" TEXT,
    "shippingZip" TEXT,
    "shippingCountry" TEXT NOT NULL DEFAULT 'US',
    "billingState" TEXT,
    "lineItems" TEXT,
    "taxBreakdown" TEXT,
    "rawData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalSales" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxableSales" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxCollected" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "platforms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_verifyToken_key" ON "User"("verifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_verifyToken_idx" ON "User"("verifyToken");

-- CreateIndex
CREATE INDEX "User_resetToken_idx" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Business_userId_idx" ON "Business"("userId");

-- CreateIndex
CREATE INDEX "NexusState_businessId_idx" ON "NexusState"("businessId");

-- CreateIndex
CREATE INDEX "NexusState_stateCode_idx" ON "NexusState"("stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "NexusState_businessId_stateCode_key" ON "NexusState"("businessId", "stateCode");

-- CreateIndex
CREATE INDEX "Calculation_userId_idx" ON "Calculation"("userId");

-- CreateIndex
CREATE INDEX "Calculation_stateCode_idx" ON "Calculation"("stateCode");

-- CreateIndex
CREATE INDEX "Calculation_createdAt_idx" ON "Calculation"("createdAt");

-- CreateIndex
CREATE INDEX "Filing_businessId_idx" ON "Filing"("businessId");

-- CreateIndex
CREATE INDEX "Filing_stateCode_idx" ON "Filing"("stateCode");

-- CreateIndex
CREATE INDEX "Filing_dueDate_idx" ON "Filing"("dueDate");

-- CreateIndex
CREATE INDEX "Filing_status_idx" ON "Filing"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Filing_businessId_stateCode_periodStart_key" ON "Filing"("businessId", "stateCode", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "TaxRateCache_stateCode_idx" ON "TaxRateCache"("stateCode");

-- CreateIndex
CREATE INDEX "TaxRateCache_zipCode_idx" ON "TaxRateCache"("zipCode");

-- CreateIndex
CREATE INDEX "TaxRateCache_validUntil_idx" ON "TaxRateCache"("validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRateCache_stateCode_zipCode_city_key" ON "TaxRateCache"("stateCode", "zipCode", "city");

-- CreateIndex
CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_to_idx" ON "EmailLog"("to");

-- CreateIndex
CREATE INDEX "EmailLog_template_idx" ON "EmailLog"("template");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "PlatformConnection_userId_idx" ON "PlatformConnection"("userId");

-- CreateIndex
CREATE INDEX "PlatformConnection_platform_idx" ON "PlatformConnection"("platform");

-- CreateIndex
CREATE INDEX "PlatformConnection_lastSyncAt_idx" ON "PlatformConnection"("lastSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConnection_userId_platform_platformId_key" ON "PlatformConnection"("userId", "platform", "platformId");

-- CreateIndex
CREATE INDEX "ImportedOrder_userId_idx" ON "ImportedOrder"("userId");

-- CreateIndex
CREATE INDEX "ImportedOrder_platformConnectionId_idx" ON "ImportedOrder"("platformConnectionId");

-- CreateIndex
CREATE INDEX "ImportedOrder_orderDate_idx" ON "ImportedOrder"("orderDate");

-- CreateIndex
CREATE INDEX "ImportedOrder_shippingState_idx" ON "ImportedOrder"("shippingState");

-- CreateIndex
CREATE INDEX "ImportedOrder_status_idx" ON "ImportedOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedOrder_platform_platformOrderId_key" ON "ImportedOrder"("platform", "platformOrderId");

-- CreateIndex
CREATE INDEX "SalesSummary_userId_idx" ON "SalesSummary"("userId");

-- CreateIndex
CREATE INDEX "SalesSummary_stateCode_idx" ON "SalesSummary"("stateCode");

-- CreateIndex
CREATE INDEX "SalesSummary_period_idx" ON "SalesSummary"("period");

-- CreateIndex
CREATE UNIQUE INDEX "SalesSummary_userId_stateCode_period_key" ON "SalesSummary"("userId", "stateCode", "period");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NexusState" ADD CONSTRAINT "NexusState_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filing" ADD CONSTRAINT "Filing_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
