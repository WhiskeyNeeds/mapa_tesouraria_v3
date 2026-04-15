-- CreateEnum
CREATE TYPE "TreasuryDocOrigin" AS ENUM ('TOCONLINE', 'LOCAL');

-- CreateEnum
CREATE TYPE "TreasuryDocStatus" AS ENUM ('OPEN', 'PARTIAL', 'SETTLED', 'VOID');

-- CreateEnum
CREATE TYPE "TreasuryCategoryType" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateTable
CREATE TABLE "treasury_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TreasuryCategoryType" NOT NULL,
    "launchToc" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_bank_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ibanMasked" TEXT NOT NULL,
    "currentSaldo" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_receivables" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "pending" DECIMAL(18,2) NOT NULL,
    "origin" "TreasuryDocOrigin" NOT NULL,
    "status" "TreasuryDocStatus" NOT NULL DEFAULT 'OPEN',
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_payables" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "pending" DECIMAL(18,2) NOT NULL,
    "origin" "TreasuryDocOrigin" NOT NULL,
    "status" "TreasuryDocStatus" NOT NULL DEFAULT 'OPEN',
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_payables_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "treasury_receivables" ADD CONSTRAINT "treasury_receivables_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "treasury_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_payables" ADD CONSTRAINT "treasury_payables_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "treasury_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
