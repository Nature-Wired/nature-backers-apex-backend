-- Additive sports-only migration. Reviewed impact: docs/MILESTONE_A_MIGRATION_REVIEW.md.
-- UUIDs and updatedAt are populated by Prisma, matching the schema defaults.
CREATE TYPE "SportsCampaignStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TABLE "SportsCampaign" (
  "id" UUID PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "league" TEXT,
  "team" TEXT,
  "sponsor" TEXT,
  "event" TEXT NOT NULL,
  "venue" TEXT,
  "partners" JSONB,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "SportsCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "commitmentAmount" DECIMAL(18,2),
  "commitmentCurrency" VARCHAR(3),
  "rewardType" TEXT NOT NULL DEFAULT 'DIGITAL_BADGE',
  "rewardConfig" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdBySubject" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sports_window" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "sports_commitment" CHECK (("commitmentAmount" IS NULL AND "commitmentCurrency" IS NULL) OR ("commitmentAmount" IS NOT NULL AND "commitmentAmount" >= 0 AND "commitmentCurrency" IS NOT NULL AND "commitmentCurrency" ~ '^[A-Z]{3}$')),
  CONSTRAINT "sports_badge_type" CHECK ("rewardType" = 'DIGITAL_BADGE')
);
CREATE TABLE "AtlasProject" (
  "id" SERIAL PRIMARY KEY,
  "sourceTimestamp" TEXT NOT NULL UNIQUE,
  "metadata" JSONB NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "SportsBallotProject" (
  "id" UUID PRIMARY KEY,
  "campaignId" UUID NOT NULL,
  "atlasProjectId" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  CONSTRAINT "sports_ballot_position" CHECK ("position" BETWEEN 1 AND 3),
  CONSTRAINT "SportsBallotProject_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SportsCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SportsBallotProject_atlasProjectId_fkey" FOREIGN KEY ("atlasProjectId") REFERENCES "AtlasProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("campaignId", "atlasProjectId"),
  UNIQUE ("campaignId", "position"),
  UNIQUE ("id", "campaignId")
);
CREATE TABLE "FanSelection" (
  "id" UUID PRIMARY KEY,
  "campaignId" UUID NOT NULL,
  "ballotProjectId" UUID NOT NULL,
  "participantHash" TEXT NOT NULL,
  "idempotencyKey" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FanSelection_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SportsCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FanSelection_ballotProjectId_campaignId_fkey" FOREIGN KEY ("ballotProjectId", "campaignId") REFERENCES "SportsBallotProject"("id", "campaignId") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("campaignId", "participantHash"),
  UNIQUE ("campaignId", "idempotencyKey")
);
CREATE INDEX "FanSelection_campaignId_ballotProjectId_idx" ON "FanSelection"("campaignId", "ballotProjectId");
CREATE TABLE "RewardIssuance" (
  "id" UUID PRIMARY KEY,
  "selectionId" UUID NOT NULL UNIQUE,
  "rewardType" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "claimKeyVersion" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardIssuance_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "FanSelection"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "reward_badge_type" CHECK ("rewardType" = 'DIGITAL_BADGE')
);
