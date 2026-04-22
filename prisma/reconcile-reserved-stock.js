require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const pendingOutReservations = await prisma.transaction.groupBy({
    by: ["itemId"],
    where: {
      type: "OUT",
      status: "PENDING"
    },
    _sum: {
      quantity: true
    }
  });

  const reservedByItemId = new Map(
    pendingOutReservations.map((entry) => [entry.itemId, entry._sum.quantity ?? 0])
  );

  await prisma.$transaction(async (tx) => {
    await tx.item.updateMany({
      data: {
        reservedStock: 0
      }
    });

    for (const [itemId, reservedStock] of reservedByItemId.entries()) {
      if (reservedStock <= 0) {
        continue;
      }

      await tx.item.update({
        where: { id: itemId },
        data: { reservedStock }
      });
    }
  });

  const items = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      stock: true,
      reservedStock: true
    },
    orderBy: {
      id: "asc"
    }
  });

  const oversubscribedItems = items.filter((item) => item.reservedStock > item.stock);

  console.log("Reserved stock reconciliation completed.");
  console.table(
    items.map((item) => ({
      id: item.id,
      name: item.name,
      stock: item.stock,
      reservedStock: item.reservedStock,
      availableStock: item.stock - item.reservedStock
    }))
  );

  if (oversubscribedItems.length > 0) {
    console.warn("Some items are oversubscribed (reservedStock > stock):");
    console.table(
      oversubscribedItems.map((item) => ({
        id: item.id,
        name: item.name,
        stock: item.stock,
        reservedStock: item.reservedStock,
        shortage: item.reservedStock - item.stock
      }))
    );
  }
}

main()
  .catch((error) => {
    console.error("Failed to reconcile reserved stock:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
