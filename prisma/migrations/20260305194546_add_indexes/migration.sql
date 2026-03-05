-- CreateIndex
CREATE INDEX "ActionItem_intakeId_idx" ON "ActionItem"("intakeId");

-- CreateIndex
CREATE INDEX "ActionItem_status_idx" ON "ActionItem"("status");

-- CreateIndex
CREATE INDEX "Intake_targetOwnerId_idx" ON "Intake"("targetOwnerId");

-- CreateIndex
CREATE INDEX "Intake_submitterId_idx" ON "Intake"("submitterId");
