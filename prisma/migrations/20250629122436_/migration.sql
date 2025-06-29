/*
  Warnings:

  - A unique constraint covering the columns `[userId,address]` on the table `DeliveryDetail` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_orderId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryDetail_userId_address_key" ON "DeliveryDetail"("userId", "address");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
