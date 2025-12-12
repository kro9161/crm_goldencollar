-- CreateIndex
CREATE INDEX "AcademicYear_deletedAt_idx" ON "AcademicYear"("deletedAt");

-- CreateIndex
CREATE INDEX "CourseSession_deletedAt_idx" ON "CourseSession"("deletedAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_academicYearId_idx" ON "GeneratedDocument"("academicYearId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_deletedAt_idx" ON "GeneratedDocument"("deletedAt");

-- CreateIndex
CREATE INDEX "Level_deletedAt_idx" ON "Level"("deletedAt");

-- CreateIndex
CREATE INDEX "Note_sessionId_idx" ON "Note"("sessionId");

-- CreateIndex
CREATE INDEX "Note_studentId_idx" ON "Note"("studentId");

-- CreateIndex
CREATE INDEX "Note_deletedAt_idx" ON "Note"("deletedAt");

-- CreateIndex
CREATE INDEX "Notification_deletedAt_idx" ON "Notification"("deletedAt");

-- CreateIndex
CREATE INDEX "Payment_academicYearId_idx" ON "Payment"("academicYearId");

-- CreateIndex
CREATE INDEX "Payment_deletedAt_idx" ON "Payment"("deletedAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
