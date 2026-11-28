-- Direct X (Twitter) connections: encrypted sign-in tokens and the PKCE verifier.
ALTER TABLE `SocialAccount` ADD COLUMN `tokenCipher` TEXT NULL,
    ADD COLUMN `tokenExpiresAt` DATETIME(3) NULL;

ALTER TABLE `ConnectAttempt` ADD COLUMN `codeVerifier` VARCHAR(128) NULL;
