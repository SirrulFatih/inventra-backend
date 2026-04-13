-- AlterTable
ALTER TABLE `Transaction`
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `approvedBy` INTEGER NULL,
    ADD COLUMN `approvedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Transaction_approvedBy_idx` ON `Transaction`(`approvedBy`);
CREATE INDEX `Transaction_status_idx` ON `Transaction`(`status`);

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
