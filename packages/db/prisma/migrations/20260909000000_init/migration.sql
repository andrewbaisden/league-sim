-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('LEAGUE');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('SCHEDULED', 'LIVE', 'HALF_TIME', 'FINISHED', 'POSTPONED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SimulationKind" AS ENUM ('MATCH', 'SEASON', 'MONTE_CARLO');

-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OverrideKind" AS ENUM ('EXACT_SCORE', 'OUTCOME');

-- CreateEnum
CREATE TYPE "ForcedOutcome" AS ENUM ('HOME', 'DRAW', 'AWAY');

-- CreateTable
CREATE TABLE "Country" (
    "id" UUID NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" UUID NOT NULL,
    "countryId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" "CompetitionFormat" NOT NULL DEFAULT 'LEAGUE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "SeasonStatus" NOT NULL,
    "currentMatchweek" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionRuleSet" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "pointsForWin" INTEGER NOT NULL DEFAULT 3,
    "pointsForDraw" INTEGER NOT NULL DEFAULT 1,
    "pointsForLoss" INTEGER NOT NULL DEFAULT 0,
    "fixturesPerPair" INTEGER NOT NULL DEFAULT 2,
    "rankingCriteria" JSONB NOT NULL,
    "zones" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL,
    "countryId" UUID,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "abbreviation" VARCHAR(5) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSeason" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "seed" INTEGER,

    CONSTRAINT "TeamSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "homeTeamSeasonId" UUID NOT NULL,
    "awayTeamSeasonId" UUID NOT NULL,
    "kickoff" TIMESTAMPTZ(3) NOT NULL,
    "matchweek" INTEGER,
    "venue" TEXT,
    "status" "FixtureStatus" NOT NULL DEFAULT 'SCHEDULED',
    "providerUpdatedAt" TIMESTAMPTZ(3),
    "lastSyncedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" UUID NOT NULL,
    "fixtureId" UUID NOT NULL,
    "homeGoals" INTEGER NOT NULL,
    "awayGoals" INTEGER NOT NULL,
    "halfTimeHomeGoals" INTEGER,
    "halfTimeAwayGoals" INTEGER,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "providerUpdatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandingSnapshot" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "cutoffAt" TIMESTAMPTZ(3) NOT NULL,
    "matchweek" INTEGER,
    "ruleVersion" TEXT NOT NULL,
    "dataFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandingSnapshotRow" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "teamSeasonId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "played" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "draws" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "goalDifference" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "form" JSONB NOT NULL,
    "tieUnresolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StandingSnapshotRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRatingSet" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "cutoffAt" TIMESTAMPTZ(3) NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "leagueHomeGoals" DECIMAL(8,6) NOT NULL,
    "leagueAwayGoals" DECIMAL(8,6) NOT NULL,
    "priorEquivalentMatches" INTEGER NOT NULL,
    "recentWeight" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamRatingSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRatingSnapshot" (
    "id" UUID NOT NULL,
    "ratingSetId" UUID NOT NULL,
    "teamSeasonId" UUID NOT NULL,
    "homeAttack" DECIMAL(8,6) NOT NULL,
    "awayAttack" DECIMAL(8,6) NOT NULL,
    "homeDefence" DECIMAL(8,6) NOT NULL,
    "awayDefence" DECIMAL(8,6) NOT NULL,
    "recentAttack" DECIMAL(8,6) NOT NULL,
    "recentDefence" DECIMAL(8,6) NOT NULL,
    "sample" JSONB NOT NULL,

    CONSTRAINT "TeamRatingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCompetitionMap" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "competitionId" UUID NOT NULL,

    CONSTRAINT "ProviderCompetitionMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSeasonMap" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "seasonId" UUID NOT NULL,

    CONSTRAINT "ProviderSeasonMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTeamMap" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "ProviderTeamMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderFixtureMap" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "fixtureId" UUID NOT NULL,

    CONSTRAINT "ProviderFixtureMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "changedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncCursor" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "cursor" TEXT,
    "lastSuccessAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationBaseSnapshot" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "ruleSetId" UUID NOT NULL,
    "ratingSetId" UUID NOT NULL,
    "cutoffAt" TIMESTAMPTZ(3) NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationBaseSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationScenario" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "baseSnapshotId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SimulationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioFixtureOverride" (
    "id" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "fixtureId" UUID NOT NULL,
    "kind" "OverrideKind" NOT NULL,
    "outcome" "ForcedOutcome",
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,

    CONSTRAINT "ScenarioFixtureOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioTeamAdjustment" (
    "id" UUID NOT NULL,
    "scenarioId" UUID NOT NULL,
    "teamSeasonId" UUID NOT NULL,
    "attackMultiplier" DECIMAL(5,4) NOT NULL DEFAULT 1,
    "defenceMultiplier" DECIMAL(5,4) NOT NULL DEFAULT 1,

    CONSTRAINT "ScenarioTeamAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationBatch" (
    "id" UUID NOT NULL,
    "ownerId" UUID,
    "scenarioId" UUID,
    "baseSnapshotId" UUID NOT NULL,
    "kind" "SimulationKind" NOT NULL,
    "status" "SimulationStatus" NOT NULL DEFAULT 'QUEUED',
    "seed" BIGINT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "runCount" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "inputHash" TEXT NOT NULL,
    "inputManifest" JSONB NOT NULL,
    "durationMs" INTEGER,
    "fixturesSimulated" INTEGER,
    "jobId" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "SimulationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulatedFixture" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "fixtureId" UUID NOT NULL,
    "homeGoals" INTEGER NOT NULL,
    "awayGoals" INTEGER NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "SimulatedFixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationTeamProjection" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "teamSeasonId" UUID NOT NULL,
    "expectedPoints" DECIMAL(8,4) NOT NULL,
    "expectedPosition" DECIMAL(8,4) NOT NULL,
    "titleProbability" DECIMAL(8,6) NOT NULL,
    "topFourProbability" DECIMAL(8,6) NOT NULL,
    "topSixProbability" DECIMAL(8,6) NOT NULL,
    "relegationProbability" DECIMAL(8,6) NOT NULL,

    CONSTRAINT "SimulationTeamProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationPositionProbability" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "teamSeasonId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "count" DECIMAL(12,4) NOT NULL,
    "probability" DECIMAL(8,6) NOT NULL,

    CONSTRAINT "SimulationPositionProbability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateIndex
CREATE INDEX "Season_competitionId_status_idx" ON "Season"("competitionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Season_competitionId_label_key" ON "Season"("competitionId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionRuleSet_seasonId_key" ON "CompetitionRuleSet"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "TeamSeason_teamId_seasonId_idx" ON "TeamSeason"("teamId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSeason_seasonId_teamId_key" ON "TeamSeason"("seasonId", "teamId");

-- CreateIndex
CREATE INDEX "Fixture_seasonId_kickoff_idx" ON "Fixture"("seasonId", "kickoff");

-- CreateIndex
CREATE INDEX "Fixture_seasonId_matchweek_idx" ON "Fixture"("seasonId", "matchweek");

-- CreateIndex
CREATE INDEX "Fixture_seasonId_status_idx" ON "Fixture"("seasonId", "status");

-- CreateIndex
CREATE INDEX "Fixture_homeTeamSeasonId_idx" ON "Fixture"("homeTeamSeasonId");

-- CreateIndex
CREATE INDEX "Fixture_awayTeamSeasonId_idx" ON "Fixture"("awayTeamSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchResult_fixtureId_key" ON "MatchResult"("fixtureId");

-- CreateIndex
CREATE INDEX "StandingSnapshot_seasonId_cutoffAt_idx" ON "StandingSnapshot"("seasonId", "cutoffAt");

-- CreateIndex
CREATE UNIQUE INDEX "StandingSnapshot_seasonId_dataFingerprint_key" ON "StandingSnapshot"("seasonId", "dataFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "StandingSnapshotRow_snapshotId_teamSeasonId_key" ON "StandingSnapshotRow"("snapshotId", "teamSeasonId");

-- CreateIndex
CREATE INDEX "TeamRatingSet_seasonId_cutoffAt_idx" ON "TeamRatingSet"("seasonId", "cutoffAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamRatingSnapshot_ratingSetId_teamSeasonId_key" ON "TeamRatingSnapshot"("ratingSetId", "teamSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCompetitionMap_provider_externalId_key" ON "ProviderCompetitionMap"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCompetitionMap_provider_competitionId_key" ON "ProviderCompetitionMap"("provider", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSeasonMap_provider_externalId_key" ON "ProviderSeasonMap"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSeasonMap_provider_seasonId_key" ON "ProviderSeasonMap"("provider", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTeamMap_provider_externalId_key" ON "ProviderTeamMap"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTeamMap_provider_teamId_key" ON "ProviderTeamMap"("provider", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderFixtureMap_provider_externalId_key" ON "ProviderFixtureMap"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderFixtureMap_provider_fixtureId_key" ON "ProviderFixtureMap"("provider", "fixtureId");

-- CreateIndex
CREATE INDEX "SyncRun_provider_jobType_createdAt_idx" ON "SyncRun"("provider", "jobType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncCursor_provider_resourceType_scope_key" ON "SyncCursor"("provider", "resourceType", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationBaseSnapshot_fingerprint_key" ON "SimulationBaseSnapshot"("fingerprint");

-- CreateIndex
CREATE INDEX "SimulationBaseSnapshot_seasonId_cutoffAt_idx" ON "SimulationBaseSnapshot"("seasonId", "cutoffAt");

-- CreateIndex
CREATE INDEX "SimulationScenario_ownerId_updatedAt_idx" ON "SimulationScenario"("ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioFixtureOverride_scenarioId_fixtureId_key" ON "ScenarioFixtureOverride"("scenarioId", "fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioTeamAdjustment_scenarioId_teamSeasonId_key" ON "ScenarioTeamAdjustment"("scenarioId", "teamSeasonId");

-- CreateIndex
CREATE INDEX "SimulationBatch_ownerId_createdAt_idx" ON "SimulationBatch"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "SimulationBatch_status_createdAt_idx" ON "SimulationBatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SimulationBatch_inputHash_idx" ON "SimulationBatch"("inputHash");

-- CreateIndex
CREATE UNIQUE INDEX "SimulatedFixture_batchId_fixtureId_key" ON "SimulatedFixture"("batchId", "fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationTeamProjection_batchId_teamSeasonId_key" ON "SimulationTeamProjection"("batchId", "teamSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationPositionProbability_batchId_teamSeasonId_position_key" ON "SimulationPositionProbability"("batchId", "teamSeasonId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRuleSet" ADD CONSTRAINT "CompetitionRuleSet_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSeason" ADD CONSTRAINT "TeamSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSeason" ADD CONSTRAINT "TeamSeason_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeTeamSeasonId_fkey" FOREIGN KEY ("homeTeamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayTeamSeasonId_fkey" FOREIGN KEY ("awayTeamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingSnapshot" ADD CONSTRAINT "StandingSnapshot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingSnapshotRow" ADD CONSTRAINT "StandingSnapshotRow_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "StandingSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingSnapshotRow" ADD CONSTRAINT "StandingSnapshotRow_teamSeasonId_fkey" FOREIGN KEY ("teamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRatingSet" ADD CONSTRAINT "TeamRatingSet_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRatingSnapshot" ADD CONSTRAINT "TeamRatingSnapshot_ratingSetId_fkey" FOREIGN KEY ("ratingSetId") REFERENCES "TeamRatingSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRatingSnapshot" ADD CONSTRAINT "TeamRatingSnapshot_teamSeasonId_fkey" FOREIGN KEY ("teamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCompetitionMap" ADD CONSTRAINT "ProviderCompetitionMap_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSeasonMap" ADD CONSTRAINT "ProviderSeasonMap_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTeamMap" ADD CONSTRAINT "ProviderTeamMap_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderFixtureMap" ADD CONSTRAINT "ProviderFixtureMap_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationBaseSnapshot" ADD CONSTRAINT "SimulationBaseSnapshot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationBaseSnapshot" ADD CONSTRAINT "SimulationBaseSnapshot_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "CompetitionRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationBaseSnapshot" ADD CONSTRAINT "SimulationBaseSnapshot_ratingSetId_fkey" FOREIGN KEY ("ratingSetId") REFERENCES "TeamRatingSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationScenario" ADD CONSTRAINT "SimulationScenario_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationScenario" ADD CONSTRAINT "SimulationScenario_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationScenario" ADD CONSTRAINT "SimulationScenario_baseSnapshotId_fkey" FOREIGN KEY ("baseSnapshotId") REFERENCES "SimulationBaseSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioFixtureOverride" ADD CONSTRAINT "ScenarioFixtureOverride_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "SimulationScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioFixtureOverride" ADD CONSTRAINT "ScenarioFixtureOverride_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioTeamAdjustment" ADD CONSTRAINT "ScenarioTeamAdjustment_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "SimulationScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioTeamAdjustment" ADD CONSTRAINT "ScenarioTeamAdjustment_teamSeasonId_fkey" FOREIGN KEY ("teamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationBatch" ADD CONSTRAINT "SimulationBatch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationBatch" ADD CONSTRAINT "SimulationBatch_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "SimulationScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationBatch" ADD CONSTRAINT "SimulationBatch_baseSnapshotId_fkey" FOREIGN KEY ("baseSnapshotId") REFERENCES "SimulationBaseSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedFixture" ADD CONSTRAINT "SimulatedFixture_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SimulationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulatedFixture" ADD CONSTRAINT "SimulatedFixture_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationTeamProjection" ADD CONSTRAINT "SimulationTeamProjection_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SimulationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationTeamProjection" ADD CONSTRAINT "SimulationTeamProjection_teamSeasonId_fkey" FOREIGN KEY ("teamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationPositionProbability" ADD CONSTRAINT "SimulationPositionProbability_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SimulationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationPositionProbability" ADD CONSTRAINT "SimulationPositionProbability_teamSeasonId_fkey" FOREIGN KEY ("teamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
