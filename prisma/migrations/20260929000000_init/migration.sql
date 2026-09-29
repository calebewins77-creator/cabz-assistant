-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "GuildConfig" (
    "guildId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '!',
    "proofChannelId" TEXT,
    "verifiedRoleId" TEXT,
    "staffRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modLogChannelId" TEXT,
    "welcomeChannelId" TEXT,
    "welcomeMessage" TEXT,
    "goodbyeChannelId" TEXT,
    "goodbyeMessage" TEXT,
    "autoRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "ProofSubmission" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "originalMessageId" TEXT NOT NULL,
    "reviewMessageId" TEXT,
    "attachmentUrl" TEXT,
    "contentText" TEXT,
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "originalDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleGrant" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "moderatorId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TempBan" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "liftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TempBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProofSubmission_originalMessageId_key" ON "ProofSubmission"("originalMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofSubmission_reviewMessageId_key" ON "ProofSubmission"("reviewMessageId");

-- CreateIndex
CREATE INDEX "ProofSubmission_guildId_status_idx" ON "ProofSubmission"("guildId", "status");

-- CreateIndex
CREATE INDEX "RoleGrant_guildId_userId_roleId_idx" ON "RoleGrant"("guildId", "userId", "roleId");

-- CreateIndex
CREATE INDEX "RoleGrant_expiresAt_idx" ON "RoleGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "ModerationLog_guildId_createdAt_idx" ON "ModerationLog"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationLog_guildId_action_idx" ON "ModerationLog"("guildId", "action");

-- CreateIndex
CREATE INDEX "ModerationLog_guildId_targetUserId_idx" ON "ModerationLog"("guildId", "targetUserId");

-- CreateIndex
CREATE INDEX "TempBan_expiresAt_idx" ON "TempBan"("expiresAt");

