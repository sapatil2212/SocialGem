-- Manual rollback for 20261126120000_content_idea_tenancy. Prisma never runs this file.
-- Restores the single-column links. No rows are deleted; workspaceId is dropped,
-- because it can always be rebuilt from ContentPlan.
--
-- Afterwards: prisma migrate resolve --rolled-back 20261126120000_content_idea_tenancy
-- and deploy code that does not use ContentIdea.workspaceId.

ALTER TABLE `ContentIdea` DROP FOREIGN KEY `ContentIdea_media_fkey`;
ALTER TABLE `ContentIdea` DROP FOREIGN KEY `ContentIdea_plan_fkey`;
ALTER TABLE `ContentIdea` DROP FOREIGN KEY `ContentIdea_workspaceId_fkey`;

DROP INDEX `ContentIdea_workspaceId_mediaId_idx` ON `ContentIdea`;
DROP INDEX `ContentIdea_workspaceId_planId_scheduledAt_idx` ON `ContentIdea`;
DROP INDEX `ContentIdea_workspaceId_id_key` ON `ContentIdea`;
DROP INDEX `ContentPlan_workspaceId_id_key` ON `ContentPlan`;

CREATE INDEX `ContentIdea_planId_scheduledAt_idx` ON `ContentIdea`(`planId`, `scheduledAt`);
CREATE INDEX `ContentIdea_mediaId_idx` ON `ContentIdea`(`mediaId`);

ALTER TABLE `ContentIdea` DROP COLUMN `workspaceId`;

ALTER TABLE `ContentIdea` ADD CONSTRAINT `ContentIdea_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `ContentPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ContentIdea` ADD CONSTRAINT `ContentIdea_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
