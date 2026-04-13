-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Permission_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roleId` INTEGER NOT NULL,
    `permissionId` INTEGER NOT NULL,

    UNIQUE INDEX `RolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    INDEX `RolePermission_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `roleId` INTEGER NULL;

-- Seed base roles for backfill and runtime defaults
INSERT INTO `Role` (`name`) VALUES
    ('admin'),
    ('admin_operasional'),
    ('staff'),
    ('viewer')
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`);

-- Backfill User.roleId from legacy User.role values
UPDATE `User` AS `u`
JOIN `Role` AS `r`
    ON `r`.`name` = CASE
        WHEN LOWER(TRIM(`u`.`role`)) = 'admin' THEN 'admin'
        WHEN LOWER(TRIM(`u`.`role`)) = 'admin_operasional' THEN 'admin_operasional'
        WHEN LOWER(TRIM(`u`.`role`)) = 'viewer' THEN 'viewer'
        WHEN LOWER(TRIM(`u`.`role`)) = 'staff' THEN 'staff'
        WHEN LOWER(TRIM(`u`.`role`)) = 'karyawan' THEN 'staff'
        ELSE 'staff'
    END
SET `u`.`roleId` = `r`.`id`
WHERE `u`.`roleId` IS NULL;

-- Ensure roleId is populated for every user before enforcing NOT NULL
UPDATE `User` AS `u`
JOIN `Role` AS `r`
    ON `r`.`name` = 'staff'
SET `u`.`roleId` = `r`.`id`
WHERE `u`.`roleId` IS NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `roleId` INTEGER NOT NULL;
ALTER TABLE `User` ADD INDEX `User_roleId_idx`(`roleId`);
ALTER TABLE `User` DROP COLUMN `role`;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
