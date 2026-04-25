-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "googleId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'BUYER',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PartsRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buyerId" TEXT NOT NULL,
    "curatorId" TEXT,
    "primaryCategory" TEXT NOT NULL,
    "subCategory" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rawDescription" TEXT NOT NULL,
    "transcript" TEXT,
    "audioUrl" TEXT,
    "specs" TEXT NOT NULL DEFAULT '{}',
    "missingFields" TEXT NOT NULL DEFAULT '[]',
    "rejectionReasons" TEXT NOT NULL DEFAULT '[]',
    "budgetCents" INTEGER NOT NULL,
    "serviceFeeCents" INTEGER NOT NULL DEFAULT 2500,
    "waiverVersion" TEXT,
    "waiverAcceptedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paymentAuthId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartsRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PartsRequest_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "visionSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestImage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartsRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClarificationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "answeredById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClarificationMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartsRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClarificationMessage_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "sourceMarketplace" TEXT NOT NULL,
    "listingUrl" TEXT NOT NULL,
    "sellerHandle" TEXT NOT NULL,
    "sellerLocation" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "condition" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "specHighlights" TEXT NOT NULL DEFAULT '{}',
    "proofVideoUrl" TEXT,
    "confidence" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "hiddenFromBuyer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartsRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'NONE',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "escrowState" TEXT NOT NULL DEFAULT 'HELD',
    "buyerVerificationDeadline" DATETIME,
    "sellerPayoutReleaseAt" DATETIME,
    "trackingNumber" TEXT,
    "notes" TEXT,
    "timeline" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartsRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event" TEXT NOT NULL,
    "requestId" TEXT,
    "matchId" TEXT,
    "orderId" TEXT,
    "actorId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "PartsRequest_buyerId_idx" ON "PartsRequest"("buyerId");

-- CreateIndex
CREATE INDEX "PartsRequest_status_idx" ON "PartsRequest"("status");

-- CreateIndex
CREATE INDEX "PartsRequest_curatorId_idx" ON "PartsRequest"("curatorId");

-- CreateIndex
CREATE INDEX "PartsRequest_primaryCategory_idx" ON "PartsRequest"("primaryCategory");

-- CreateIndex
CREATE INDEX "RequestImage_requestId_idx" ON "RequestImage"("requestId");

-- CreateIndex
CREATE INDEX "ClarificationMessage_requestId_idx" ON "ClarificationMessage"("requestId");

-- CreateIndex
CREATE INDEX "Match_requestId_idx" ON "Match"("requestId");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_requestId_key" ON "Order"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_matchId_key" ON "Order"("matchId");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");
