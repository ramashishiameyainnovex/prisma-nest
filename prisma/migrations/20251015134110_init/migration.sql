-- CreateTable
CREATE TABLE "CompanyOff" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "weekDay" INTEGER[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffDay" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "holidayType" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "companyOffId" TEXT,

    CONSTRAINT "OffDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsersOff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offDayId" TEXT NOT NULL,

    CONSTRAINT "UsersOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsersOff_userId_offDayId_key" ON "UsersOff"("userId", "offDayId");

-- AddForeignKey
ALTER TABLE "CompanyOff" ADD CONSTRAINT "CompanyOff_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffDay" ADD CONSTRAINT "OffDay_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffDay" ADD CONSTRAINT "OffDay_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffDay" ADD CONSTRAINT "OffDay_companyOffId_fkey" FOREIGN KEY ("companyOffId") REFERENCES "CompanyOff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsersOff" ADD CONSTRAINT "UsersOff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsersOff" ADD CONSTRAINT "UsersOff_offDayId_fkey" FOREIGN KEY ("offDayId") REFERENCES "OffDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
