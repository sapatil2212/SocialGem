-- Run as the MySQL administrator AFTER the migration. Replace every CHANGE_ME and the host.
-- The app login cannot change tables, or edit the ledger, audit log and invoices.
CREATE USER 'socialgem_app'@'APP_HOST' IDENTIFIED BY 'CHANGE_ME_1' REQUIRE SSL;
CREATE USER 'socialgem_migrate'@'ADMIN_HOST' IDENTIFIED BY 'CHANGE_ME_2' REQUIRE SSL;
CREATE USER 'socialgem_backup'@'APP_HOST' IDENTIFIED BY 'CHANGE_ME_3' REQUIRE SSL;

GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`User` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`Account` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`Session` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`VerificationToken` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`Workspace` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`WorkspaceMember` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`SocialAccount` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`ConnectAttempt` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`MediaAsset` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`PostTag` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`Post` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`PostTarget` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`PublishAttempt` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`BillingAccount` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`Subscription` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`Payment` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT ON socialgem.`Invoice` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`InvoiceSequence` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT ON socialgem.`LedgerEntry` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`ProviderEvent` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`Notification` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT ON socialgem.`AuditLog` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`SystemState` TO 'socialgem_app'@'APP_HOST';
GRANT SELECT, INSERT, UPDATE, DELETE ON socialgem.`RateLimit` TO 'socialgem_app'@'APP_HOST';

GRANT ALL PRIVILEGES ON socialgem.* TO 'socialgem_migrate'@'ADMIN_HOST';
GRANT SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT ON socialgem.* TO 'socialgem_backup'@'APP_HOST';

-- Then take the shared login off this database:
-- REVOKE ALL PRIVILEGES ON socialgem.* FROM 'SHARED_LOGIN'@'%';
