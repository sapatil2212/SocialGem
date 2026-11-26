-- CreateTable
CREATE TABLE `BrandProfile` (
    `workspaceId` VARCHAR(191) NOT NULL,
    `website` VARCHAR(300) NULL,
    `data` JSON NOT NULL,
    `sources` JSON NOT NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`workspaceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentResearch` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `region` VARCHAR(80) NOT NULL,
    `data` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContentResearch_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentPlan` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `goal` VARCHAR(500) NOT NULL,
    `strategy` TEXT NOT NULL,
    `startDay` CHAR(10) NOT NULL,
    `days` INTEGER NOT NULL,
    `platforms` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContentPlan_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContentIdea` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `platforms` JSON NOT NULL,
    `format` VARCHAR(10) NOT NULL,
    `pillar` VARCHAR(60) NOT NULL,
    `topic` VARCHAR(300) NOT NULL,
    `angle` VARCHAR(500) NOT NULL,
    `captions` JSON NULL,
    `hashtags` VARCHAR(1000) NULL,
    `imagePrompt` VARCHAR(1500) NULL,
    `mediaId` VARCHAR(191) NULL,
    `postId` VARCHAR(191) NULL,
    `status` ENUM('IDEA', 'READY', 'SCHEDULED') NOT NULL DEFAULT 'IDEA',
    `error` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContentIdea_planId_scheduledAt_idx`(`planId`, `scheduledAt`),
    INDEX `ContentIdea_mediaId_idx`(`mediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiJob` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `input` JSON NOT NULL,
    `status` ENUM('RUNNING', 'DONE', 'FAILED') NOT NULL DEFAULT 'RUNNING',
    `activeKey` VARCHAR(191) NULL,
    `step` VARCHAR(300) NOT NULL,
    `error` VARCHAR(300) NULL,
    `heartbeatAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AiJob_activeKey_key`(`activeKey`),
    INDEX `AiJob_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiUsage` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NULL,
    `provider` VARCHAR(20) NOT NULL,
    `model` VARCHAR(60) NOT NULL,
    `task` VARCHAR(20) NOT NULL,
    `inputTokens` INTEGER NOT NULL DEFAULT 0,
    `outputTokens` INTEGER NOT NULL DEFAULT 0,
    `cacheRead` INTEGER NOT NULL DEFAULT 0,
    `cacheWrite` INTEGER NOT NULL DEFAULT 0,
    `searches` INTEGER NOT NULL DEFAULT 0,
    `images` INTEGER NOT NULL DEFAULT 0,
    `costUsd` DECIMAL(12, 6) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiUsage_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    INDEX `AiUsage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BrandProfile` ADD CONSTRAINT `BrandProfile_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentResearch` ADD CONSTRAINT `ContentResearch_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentPlan` ADD CONSTRAINT `ContentPlan_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentIdea` ADD CONSTRAINT `ContentIdea_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `ContentPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentIdea` ADD CONSTRAINT `ContentIdea_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiJob` ADD CONSTRAINT `AiJob_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiUsage` ADD CONSTRAINT `AiUsage_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

