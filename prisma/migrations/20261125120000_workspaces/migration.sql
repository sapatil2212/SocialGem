-- Stops here if any old content exists, before anything is changed.
CREATE TEMPORARY TABLE `_guard` (`n` INT NOT NULL, CONSTRAINT `old_tables_must_be_empty` CHECK (`n` = 0));
INSERT INTO `_guard` SELECT (SELECT COUNT(*) FROM `ScheduledPost`) + (SELECT COUNT(*) FROM `PostTag`) + (SELECT COUNT(*) FROM `MediaAsset`);
DROP TEMPORARY TABLE `_guard`;

DROP TABLE `ScheduledPost`;
DROP TABLE `PostTag`;
DROP TABLE `MediaAsset`;

ALTER TABLE `User` DROP COLUMN `credits`,
    ADD COLUMN `disabledAt` DATETIME(3) NULL,
    ADD COLUMN `isSuperAdmin` BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX `Session_userId_idx` ON `Session`(`userId`);

CREATE TABLE `Workspace` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `businessType` VARCHAR(30) NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    `externalUserId` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
    `billingAccountId` VARCHAR(191) NOT NULL,
    `emailOnFailure` BOOLEAN NOT NULL DEFAULT true,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Workspace_externalUserId_key`(`externalUserId`),
    INDEX `Workspace_billingAccountId_idx`(`billingAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WorkspaceMember` (
    `workspaceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'EDITOR', 'VIEWER') NOT NULL DEFAULT 'OWNER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WorkspaceMember_userId_idx`(`userId`),
    PRIMARY KEY (`workspaceId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SocialAccount` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `platform` ENUM('FACEBOOK', 'INSTAGRAM', 'X', 'YOUTUBE', 'TIKTOK', 'LINKEDIN', 'THREADS', 'PINTEREST') NOT NULL,
    `muapiAccountId` INTEGER NULL,
    `claimKey` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
    `platformUserId` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
    `name` VARCHAR(191) NOT NULL,
    `avatarUrl` TEXT NULL,
    `status` ENUM('ACTIVE', 'NEEDS_RECONNECT', 'DISCONNECTED') NOT NULL DEFAULT 'ACTIVE',
    `connectedAt` DATETIME(3) NULL,
    `disconnectedAt` DATETIME(3) NULL,
    `lastCheckedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SocialAccount_muapiAccountId_key`(`muapiAccountId`),
    UNIQUE INDEX `SocialAccount_claimKey_key`(`claimKey`),
    INDEX `SocialAccount_workspaceId_status_idx`(`workspaceId`, `status`),
    UNIQUE INDEX `SocialAccount_workspaceId_id_key`(`workspaceId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ConnectAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `platform` ENUM('FACEBOOK', 'INSTAGRAM', 'X', 'YOUTUBE', 'TIKTOK', 'LINKEDIN', 'THREADS', 'PINTEREST') NOT NULL,
    `nonceHash` CHAR(64) NOT NULL,
    `knownAccounts` JSON NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `error` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ConnectAttempt_nonceHash_key`(`nonceHash`),
    INDEX `ConnectAttempt_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    INDEX `ConnectAttempt_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MediaAsset` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `objectKey` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
    `sourceUrl` VARCHAR(2083) NULL,
    `name` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `durationMs` INTEGER NULL,
    `codec` VARCHAR(40) NULL,
    `folder` VARCHAR(60) NOT NULL DEFAULT 'All Media',
    `tags` VARCHAR(300) NULL,
    `status` ENUM('PENDING', 'READY', 'REJECTED', 'DELETED') NOT NULL DEFAULT 'PENDING',
    `rejectedFor` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `MediaAsset_objectKey_key`(`objectKey`),
    INDEX `MediaAsset_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    UNIQUE INDEX `MediaAsset_workspaceId_id_key`(`workspaceId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PostTag` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `color` CHAR(7) NOT NULL DEFAULT '#FF6B00',

    UNIQUE INDEX `PostTag_workspaceId_name_key`(`workspaceId`, `name`),
    UNIQUE INDEX `PostTag_workspaceId_id_key`(`workspaceId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `requestKey` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
    `title` VARCHAR(300) NULL,
    `caption` TEXT NOT NULL,
    `mediaId` VARCHAR(191) NULL,
    `tagId` VARCHAR(191) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Post_workspaceId_scheduledAt_idx`(`workspaceId`, `scheduledAt`),
    INDEX `Post_workspaceId_mediaId_idx`(`workspaceId`, `mediaId`),
    INDEX `Post_workspaceId_tagId_idx`(`workspaceId`, `tagId`),
    UNIQUE INDEX `Post_workspaceId_id_key`(`workspaceId`, `id`),
    UNIQUE INDEX `Post_workspaceId_requestKey_key`(`workspaceId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PostTarget` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `platform` ENUM('FACEBOOK', 'INSTAGRAM', 'X', 'YOUTUBE', 'TIKTOK', 'LINKEDIN', 'THREADS', 'PINTEREST') NOT NULL,
    `socialAccountId` VARCHAR(191) NULL,
    `caption` TEXT NULL,
    `mediaId` VARCHAR(191) NULL,
    `options` JSON NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'QUEUED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'NEEDS_CHECK') NOT NULL DEFAULT 'DRAFT',
    `scheduledAt` DATETIME(3) NULL,
    `claimAt` DATETIME(3) NULL,
    `pollAt` DATETIME(3) NULL,
    `leaseToken` CHAR(36) NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NULL,
    `platformPostId` VARCHAR(191) NULL,
    `publishedUrl` VARCHAR(2083) NULL,
    `costUsd` DECIMAL(12, 6) NULL,
    `errorCode` VARCHAR(40) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PostTarget_claimAt_idx`(`claimAt`),
    INDEX `PostTarget_pollAt_idx`(`pollAt`),
    INDEX `PostTarget_workspaceId_postId_idx`(`workspaceId`, `postId`),
    INDEX `PostTarget_workspaceId_socialAccountId_idx`(`workspaceId`, `socialAccountId`),
    INDEX `PostTarget_workspaceId_mediaId_idx`(`workspaceId`, `mediaId`),
    INDEX `PostTarget_workspaceId_status_scheduledAt_idx`(`workspaceId`, `status`, `scheduledAt`),
    INDEX `PostTarget_workspaceId_scheduledAt_idx`(`workspaceId`, `scheduledAt`),
    INDEX `PostTarget_status_updatedAt_idx`(`status`, `updatedAt`),
    UNIQUE INDEX `PostTarget_postId_platform_socialAccountId_key`(`postId`, `platform`, `socialAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PublishAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `state` ENUM('SENDING', 'ACCEPTED', 'SUCCEEDED', 'FAILED', 'AMBIGUOUS') NOT NULL DEFAULT 'SENDING',
    `requestId` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
    `hookTokenHash` CHAR(64) NULL,
    `httpStatus` INTEGER NULL,
    `submitCostUsd` DECIMAL(12, 6) NULL,
    `resultCostUsd` DECIMAL(12, 6) NULL,
    `balanceUsd` DECIMAL(12, 4) NULL,
    `errorCode` VARCHAR(40) NULL,
    `errorMessage` TEXT NULL,
    `response` JSON NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PublishAttempt_requestId_key`(`requestId`),
    UNIQUE INDEX `PublishAttempt_hookTokenHash_key`(`hookTokenHash`),
    INDEX `PublishAttempt_state_sentAt_idx`(`state`, `sentAt`),
    UNIQUE INDEX `PublishAttempt_targetId_number_key`(`targetId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BillingAccount` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `businessName` VARCHAR(191) NULL,
    `billingAddress` JSON NULL,
    `gstin` VARCHAR(15) NULL,
    `trialUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BillingAccount_ownerUserId_key`(`ownerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `billingAccountId` VARCHAR(191) NOT NULL,
    `currentKey` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
    `provider` ENUM('RAZORPAY', 'STRIPE') NULL,
    `providerRef` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
    `planKey` VARCHAR(40) NOT NULL,
    `planSnapshot` JSON NOT NULL,
    `status` ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED') NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscription_currentKey_key`(`currentKey`),
    INDEX `Subscription_billingAccountId_status_idx`(`billingAccountId`, `status`),
    INDEX `Subscription_status_periodEnd_idx`(`status`, `periodEnd`),
    UNIQUE INDEX `Subscription_provider_providerRef_key`(`provider`, `providerRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `billingAccountId` VARCHAR(191) NOT NULL,
    `provider` ENUM('RAZORPAY', 'STRIPE') NOT NULL,
    `providerRef` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `taxMinor` INTEGER NOT NULL DEFAULT 0,
    `currency` CHAR(3) NOT NULL,
    `status` ENUM('CREATED', 'PAID', 'FAILED', 'REFUNDED') NOT NULL,
    `planKey` VARCHAR(40) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Payment_billingAccountId_createdAt_idx`(`billingAccountId`, `createdAt`),
    INDEX `Payment_status_paidAt_idx`(`status`, `paidAt`),
    UNIQUE INDEX `Payment_provider_providerRef_key`(`provider`, `providerRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `number` VARCHAR(16) NOT NULL,
    `details` JSON NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Invoice_paymentId_key`(`paymentId`),
    UNIQUE INDEX `Invoice_number_key`(`number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InvoiceSequence` (
    `fiscalYear` VARCHAR(9) NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`fiscalYear`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `billingAccountId` VARCHAR(191) NOT NULL,
    `unit` ENUM('POST', 'AI') NOT NULL,
    `type` ENUM('GRANT', 'RESERVE', 'CAPTURE', 'RELEASE', 'ADJUST', 'EXPIRE') NOT NULL,
    `amount` INTEGER NOT NULL,
    `periodKey` VARCHAR(40) NOT NULL,
    `idempotencyKey` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
    `targetId` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `actorUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LedgerEntry_idempotencyKey_key`(`idempotencyKey`),
    INDEX `LedgerEntry_billingAccountId_unit_periodKey_idx`(`billingAccountId`, `unit`, `periodKey`),
    INDEX `LedgerEntry_targetId_idx`(`targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProviderEvent` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `eventId` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
    `type` VARCHAR(80) NOT NULL,
    `payloadHash` CHAR(64) NOT NULL,
    `processedAt` DATETIME(3) NULL,
    `error` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProviderEvent_provider_eventId_key`(`provider`, `eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NULL,
    `type` VARCHAR(40) NOT NULL,
    `data` JSON NOT NULL,
    `dedupeKey` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
    `readAt` DATETIME(3) NULL,
    `emailAt` DATETIME(3) NULL,
    `emailTries` INTEGER NOT NULL DEFAULT 0,
    `emailedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Notification_dedupeKey_key`(`dedupeKey`),
    INDEX `Notification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    INDEX `Notification_workspaceId_idx`(`workspaceId`),
    INDEX `Notification_emailAt_idx`(`emailAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entityType` VARCHAR(40) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SystemState` (
    `key` VARCHAR(60) NOT NULL,
    `value` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Workspace` ADD CONSTRAINT `Workspace_billingAccountId_fkey` FOREIGN KEY (`billingAccountId`) REFERENCES `BillingAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `WorkspaceMember` ADD CONSTRAINT `WorkspaceMember_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `WorkspaceMember` ADD CONSTRAINT `WorkspaceMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SocialAccount` ADD CONSTRAINT `SocialAccount_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ConnectAttempt` ADD CONSTRAINT `ConnectAttempt_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ConnectAttempt` ADD CONSTRAINT `ConnectAttempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PostTag` ADD CONSTRAINT `PostTag_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Post` ADD CONSTRAINT `Post_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Post` ADD CONSTRAINT `Post_media_fkey` FOREIGN KEY (`workspaceId`, `mediaId`) REFERENCES `MediaAsset`(`workspaceId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Post` ADD CONSTRAINT `Post_tag_fkey` FOREIGN KEY (`workspaceId`, `tagId`) REFERENCES `PostTag`(`workspaceId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PostTarget` ADD CONSTRAINT `PostTarget_post_fkey` FOREIGN KEY (`workspaceId`, `postId`) REFERENCES `Post`(`workspaceId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PostTarget` ADD CONSTRAINT `PostTarget_account_fkey` FOREIGN KEY (`workspaceId`, `socialAccountId`) REFERENCES `SocialAccount`(`workspaceId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PostTarget` ADD CONSTRAINT `PostTarget_media_fkey` FOREIGN KEY (`workspaceId`, `mediaId`) REFERENCES `MediaAsset`(`workspaceId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PublishAttempt` ADD CONSTRAINT `PublishAttempt_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `PostTarget`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `BillingAccount` ADD CONSTRAINT `BillingAccount_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_billingAccountId_fkey` FOREIGN KEY (`billingAccountId`) REFERENCES `BillingAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Payment` ADD CONSTRAINT `Payment_billingAccountId_fkey` FOREIGN KEY (`billingAccountId`) REFERENCES `BillingAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_billingAccountId_fkey` FOREIGN KEY (`billingAccountId`) REFERENCES `BillingAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Notification` ADD CONSTRAINT `Notification_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Payment` ADD CONSTRAINT `Payment_amount_check` CHECK (`amountMinor` >= 0 AND `taxMinor` >= 0);
ALTER TABLE `PostTarget` ADD CONSTRAINT `PostTarget_attempts_check` CHECK (`attemptCount` >= 0);
ALTER TABLE `BillingAccount` ADD CONSTRAINT `BillingAccount_gstin_check` CHECK (`gstin` IS NULL OR CHAR_LENGTH(`gstin`) = 15);
