-- M7 (docs/INTEGRATION-AUDIT.md): ContentIdea belongs to a workspace in the database itself.
-- Its plan and its image must belong to that same workspace. No rows are deleted.
--
-- MySQL does not roll back schema changes, so every check runs first. If one fails,
-- nothing has been changed and the migration can simply be run again after a fix.

-- 1. Stop if any idea links to an image from a different workspace than its plan.
--    (Ideas without a plan cannot exist: the old foreign key on planId forbids it.)
CREATE TEMPORARY TABLE `_m7_guard` (
    `n` INT NOT NULL,
    CONSTRAINT `ideas_must_not_link_another_workspaces_image` CHECK (`n` = 0)
);
INSERT INTO `_m7_guard` (`n`)
SELECT COUNT(*)
FROM `ContentIdea` i
JOIN `ContentPlan` p ON p.`id` = i.`planId`
JOIN `MediaAsset` m ON m.`id` = i.`mediaId`
WHERE m.`workspaceId` <> p.`workspaceId`;
DROP TEMPORARY TABLE `_m7_guard`;

-- 2. Add the owner, filled from each idea's plan.
ALTER TABLE `ContentIdea` ADD COLUMN `workspaceId` VARCHAR(191) NULL AFTER `id`;

UPDATE `ContentIdea` i
JOIN `ContentPlan` p ON p.`id` = i.`planId`
SET i.`workspaceId` = p.`workspaceId`;

ALTER TABLE `ContentIdea` MODIFY `workspaceId` VARCHAR(191) NOT NULL;

-- 3. Replace the single-column links with workspace-scoped ones.
ALTER TABLE `ContentIdea` DROP FOREIGN KEY `ContentIdea_planId_fkey`;
ALTER TABLE `ContentIdea` DROP FOREIGN KEY `ContentIdea_mediaId_fkey`;
DROP INDEX `ContentIdea_planId_scheduledAt_idx` ON `ContentIdea`;
DROP INDEX `ContentIdea_mediaId_idx` ON `ContentIdea`;

CREATE UNIQUE INDEX `ContentPlan_workspaceId_id_key` ON `ContentPlan`(`workspaceId`, `id`);
CREATE UNIQUE INDEX `ContentIdea_workspaceId_id_key` ON `ContentIdea`(`workspaceId`, `id`);
CREATE INDEX `ContentIdea_workspaceId_planId_scheduledAt_idx` ON `ContentIdea`(`workspaceId`, `planId`, `scheduledAt`);
CREATE INDEX `ContentIdea_workspaceId_mediaId_idx` ON `ContentIdea`(`workspaceId`, `mediaId`);

ALTER TABLE `ContentIdea` ADD CONSTRAINT `ContentIdea_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ContentIdea` ADD CONSTRAINT `ContentIdea_plan_fkey` FOREIGN KEY (`workspaceId`, `planId`) REFERENCES `ContentPlan`(`workspaceId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- Restrict, not SET NULL: clearing a composite key would also clear workspaceId. Media is only ever soft-deleted.
ALTER TABLE `ContentIdea` ADD CONSTRAINT `ContentIdea_media_fkey` FOREIGN KEY (`workspaceId`, `mediaId`) REFERENCES `MediaAsset`(`workspaceId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;
