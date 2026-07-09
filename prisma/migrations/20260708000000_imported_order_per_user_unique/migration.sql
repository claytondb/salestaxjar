-- Make ImportedOrder uniqueness per-user instead of global
DROP INDEX IF EXISTS "ImportedOrder_platform_platformOrderId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ImportedOrder_userId_platform_platformOrderId_key" ON "ImportedOrder"("userId", "platform", "platformOrderId");
