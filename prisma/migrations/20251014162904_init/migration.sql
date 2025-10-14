-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shiftCreatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_attributes" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "breakDuration" INTEGER,
    "gracePeriodMinutes" INTEGER,
    "description" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_attribute_assignments" (
    "id" TEXT NOT NULL,
    "shiftAttributeId" TEXT NOT NULL,
    "assignedUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_attribute_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shift_attribute_assignments_shiftAttributeId_assignedUserId_key" ON "shift_attribute_assignments"("shiftAttributeId", "assignedUserId");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_shiftCreatedBy_fkey" FOREIGN KEY ("shiftCreatedBy") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_attributes" ADD CONSTRAINT "shift_attributes_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_attribute_assignments" ADD CONSTRAINT "shift_attribute_assignments_shiftAttributeId_fkey" FOREIGN KEY ("shiftAttributeId") REFERENCES "shift_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_attribute_assignments" ADD CONSTRAINT "shift_attribute_assignments_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
