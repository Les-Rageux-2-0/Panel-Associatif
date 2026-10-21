-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(30) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `passwordHash` VARCHAR(255) NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MANAGER', 'RECRUITER', 'MEMBER', 'PARENT', 'ACCOUNTANT') NOT NULL DEFAULT 'MEMBER',
    `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    `emailVerifiedAt` DATETIME(3) NULL,
    `birthDate` DATE NULL,
    `phone` VARCHAR(30) NULL,
    `guardianName` VARCHAR(160) NULL,
    `guardianEmail` VARCHAR(254) NULL,
    `guardianPhone` VARCHAR(30) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_status_idx`(`role`, `status`),
    INDEX `users_birthDate_idx`(`birthDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_sessions` (
    `id` VARCHAR(30) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `auth_sessions_tokenHash_key`(`tokenHash`),
    INDEX `auth_sessions_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_templates` (
    `id` VARCHAR(30) NOT NULL,
    `type` ENUM('PLAYER_VOLUNTEER_ADULT', 'ROSTER_CONTRACT', 'RECRUITER_CONTRACT', 'PLAYER_MINOR', 'PARENTAL_AUTHORIZATION', 'SUSPENSION_NOTICE', 'DONATION_RECEIPT', 'ACCOUNTING_LEDGER') NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `fields` JSON NOT NULL,
    `bodyTemplate` LONGTEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `document_templates_type_isActive_idx`(`type`, `isActive`),
    UNIQUE INDEX `document_templates_type_version_key`(`type`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` VARCHAR(30) NOT NULL,
    `type` ENUM('PLAYER_VOLUNTEER_ADULT', 'ROSTER_CONTRACT', 'RECRUITER_CONTRACT', 'PLAYER_MINOR', 'PARENTAL_AUTHORIZATION', 'SUSPENSION_NOTICE', 'DONATION_RECEIPT', 'ACCOUNTING_LEDGER') NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'PENDING_SIGNATURES', 'PARTIALLY_SIGNED', 'SIGNED', 'REFUSED', 'EXPIRED', 'CANCELLED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `title` VARCHAR(200) NOT NULL,
    `reference` VARCHAR(60) NOT NULL,
    `templateId` VARCHAR(30) NULL,
    `createdById` VARCHAR(30) NOT NULL,
    `templateVersion` INTEGER NULL,
    `formData` JSON NOT NULL,
    `pdfOriginalKey` VARCHAR(500) NULL,
    `pdfFinalKey` VARCHAR(500) NULL,
    `contentHash` VARCHAR(128) NULL,
    `sentAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `documents_reference_key`(`reference`),
    INDEX `documents_type_status_idx`(`type`, `status`),
    INDEX `documents_createdById_createdAt_idx`(`createdById`, `createdAt`),
    INDEX `documents_status_expiresAt_idx`(`status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_signers` (
    `id` VARCHAR(30) NOT NULL,
    `documentId` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NULL,
    `email` VARCHAR(254) NOT NULL,
    `fullName` VARCHAR(160) NOT NULL,
    `role` ENUM('PLAYER', 'RECRUITER', 'ROSTER_MANAGER', 'LEGAL_GUARDIAN', 'TEAM_REPRESENTATIVE', 'DONOR', 'OTHER') NOT NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'SIGNED', 'REFUSED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `signingOrder` INTEGER NOT NULL DEFAULT 1,
    `invitationTokenHash` VARCHAR(255) NULL,
    `invitedAt` DATETIME(3) NULL,
    `signedAt` DATETIME(3) NULL,
    `refusedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `document_signers_invitationTokenHash_key`(`invitationTokenHash`),
    INDEX `document_signers_email_status_idx`(`email`, `status`),
    INDEX `document_signers_documentId_signingOrder_idx`(`documentId`, `signingOrder`),
    UNIQUE INDEX `document_signers_documentId_email_role_key`(`documentId`, `email`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verifications` (
    `id` VARCHAR(30) NOT NULL,
    `signerId` VARCHAR(30) NOT NULL,
    `codeHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 5,
    `consumedAt` DATETIME(3) NULL,
    `invalidatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_verifications_signerId_expiresAt_idx`(`signerId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `signature_events` (
    `id` VARCHAR(30) NOT NULL,
    `documentId` VARCHAR(30) NOT NULL,
    `signerId` VARCHAR(30) NOT NULL,
    `action` ENUM('CODE_VERIFIED', 'CONSENT_GIVEN', 'SIGNED', 'REFUSED', 'INVITATION_SENT', 'INVITATION_REVOKED') NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipHash` VARCHAR(128) NULL,
    `userAgent` VARCHAR(500) NULL,
    `documentHash` VARCHAR(128) NULL,
    `evidence` JSON NULL,

    INDEX `signature_events_documentId_occurredAt_idx`(`documentId`, `occurredAt`),
    INDEX `signature_events_signerId_occurredAt_idx`(`signerId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rosters` (
    `id` VARCHAR(30) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `game` VARCHAR(100) NOT NULL,
    `status` ENUM('RECRUITING', 'ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'RECRUITING',
    `description` TEXT NULL,
    `createdById` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rosters_game_status_idx`(`game`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roster_members` (
    `id` VARCHAR(30) NOT NULL,
    `rosterId` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `position` VARCHAR(100) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leftAt` DATETIME(3) NULL,

    INDEX `roster_members_userId_leftAt_idx`(`userId`, `leftAt`),
    UNIQUE INDEX `roster_members_rosterId_userId_key`(`rosterId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `disciplinary_actions` (
    `id` VARCHAR(30) NOT NULL,
    `targetUserId` VARCHAR(30) NOT NULL,
    `createdById` VARCHAR(30) NOT NULL,
    `type` ENUM('WARNING', 'TEMPORARY_SUSPENSION', 'OTHER') NOT NULL,
    `reason` TEXT NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `notifiedAt` DATETIME(3) NULL,
    `documentId` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `disciplinary_actions_targetUserId_startsAt_idx`(`targetUserId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `donations` (
    `id` VARCHAR(30) NOT NULL,
    `donorName` VARCHAR(180) NOT NULL,
    `donorEmail` VARCHAR(254) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'EUR',
    `receivedAt` DATETIME(3) NOT NULL,
    `paymentMethod` VARCHAR(80) NULL,
    `reference` VARCHAR(100) NULL,
    `status` ENUM('RECORDED', 'RECEIPT_ISSUED', 'CANCELLED') NOT NULL DEFAULT 'RECORDED',
    `notes` TEXT NULL,
    `recordedById` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `donations_reference_key`(`reference`),
    INDEX `donations_receivedAt_status_idx`(`receivedAt`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipts` (
    `id` VARCHAR(30) NOT NULL,
    `number` VARCHAR(60) NOT NULL,
    `donationId` VARCHAR(30) NOT NULL,
    `documentId` VARCHAR(30) NULL,
    `createdById` VARCHAR(30) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pdfKey` VARCHAR(500) NULL,
    `contentHash` VARCHAR(128) NULL,
    `isFiscal` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `receipts_number_key`(`number`),
    UNIQUE INDEX `receipts_donationId_key`(`donationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledger_entries` (
    `id` VARCHAR(30) NOT NULL,
    `entryNumber` VARCHAR(60) NOT NULL,
    `type` ENUM('DONATION', 'EXPENSE', 'OTHER_INCOME', 'ADJUSTMENT') NOT NULL,
    `status` ENUM('DRAFT', 'VALIDATED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `label` VARCHAR(200) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'EUR',
    `occurredAt` DATETIME(3) NOT NULL,
    `donationId` VARCHAR(30) NULL,
    `createdById` VARCHAR(30) NOT NULL,
    `attachmentKey` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ledger_entries_entryNumber_key`(`entryNumber`),
    INDEX `ledger_entries_occurredAt_status_idx`(`occurredAt`, `status`),
    INDEX `ledger_entries_type_occurredAt_idx`(`type`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(30) NOT NULL,
    `actorId` VARCHAR(30) NULL,
    `action` VARCHAR(120) NOT NULL,
    `entityType` VARCHAR(100) NOT NULL,
    `entityId` VARCHAR(60) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `audit_logs_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parent_player_links` (
    `id` VARCHAR(30) NOT NULL,
    `parentId` VARCHAR(30) NOT NULL,
    `playerId` VARCHAR(30) NOT NULL,
    `relationship` VARCHAR(80) NOT NULL DEFAULT 'representant_legal',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `requestedById` VARCHAR(30) NOT NULL,
    `verifiedById` VARCHAR(30) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `parent_player_links_playerId_status_idx`(`playerId`, `status`),
    INDEX `parent_player_links_parentId_status_idx`(`parentId`, `status`),
    UNIQUE INDEX `parent_player_links_parentId_playerId_key`(`parentId`, `playerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_recipients` (
    `id` VARCHAR(30) NOT NULL,
    `documentId` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `assignedById` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `document_recipients_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `document_recipients_documentId_userId_key`(`documentId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_number_counters` (
    `id` VARCHAR(80) NOT NULL,
    `year` INTEGER NOT NULL,
    `type` ENUM('PLAYER_VOLUNTEER_ADULT', 'ROSTER_CONTRACT', 'RECRUITER_CONTRACT', 'PLAYER_MINOR', 'PARENTAL_AUTHORIZATION', 'SUSPENSION_NOTICE', 'DONATION_RECEIPT', 'ACCOUNTING_LEDGER') NOT NULL,
    `currentValue` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `document_number_counters_year_type_key`(`year`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_templates` ADD CONSTRAINT `document_templates_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `document_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_signers` ADD CONSTRAINT `document_signers_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_signers` ADD CONSTRAINT `document_signers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verifications` ADD CONSTRAINT `email_verifications_signerId_fkey` FOREIGN KEY (`signerId`) REFERENCES `document_signers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `signature_events` ADD CONSTRAINT `signature_events_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `signature_events` ADD CONSTRAINT `signature_events_signerId_fkey` FOREIGN KEY (`signerId`) REFERENCES `document_signers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rosters` ADD CONSTRAINT `rosters_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roster_members` ADD CONSTRAINT `roster_members_rosterId_fkey` FOREIGN KEY (`rosterId`) REFERENCES `rosters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roster_members` ADD CONSTRAINT `roster_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disciplinary_actions` ADD CONSTRAINT `disciplinary_actions_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disciplinary_actions` ADD CONSTRAINT `disciplinary_actions_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donations` ADD CONSTRAINT `donations_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_donationId_fkey` FOREIGN KEY (`donationId`) REFERENCES `donations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_donationId_fkey` FOREIGN KEY (`donationId`) REFERENCES `donations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parent_player_links` ADD CONSTRAINT `parent_player_links_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parent_player_links` ADD CONSTRAINT `parent_player_links_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_recipients` ADD CONSTRAINT `document_recipients_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_recipients` ADD CONSTRAINT `document_recipients_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
