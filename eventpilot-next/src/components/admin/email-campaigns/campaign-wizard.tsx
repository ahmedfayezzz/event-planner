"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { WizardProgress } from "./wizard-progress";
import { StepRecipients } from "./step-recipients";
import { StepCompose } from "./step-compose";
import { StepReview } from "./step-review";
import type { SelectedUser, CampaignFilters, Attachment } from "./types";
import { WIZARD_STEPS } from "./types";

interface CampaignWizardProps {
  onSuccess?: () => void;
}

export function CampaignWizard({ onSuccess }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Recipients
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [filters, setFilters] = useState<CampaignFilters>({
    roleFilter: "all",
  });

  // Step 2: Compose
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const handleSuccess = useCallback(() => {
    // Reset wizard
    setCurrentStep(0);
    setSelectedUsers([]);
    setFilters({ roleFilter: "all" });
    setSubject("");
    setContent("");
    setAttachments([]);
    onSuccess?.();
  }, [onSuccess]);

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="py-6">
          <WizardProgress currentStep={currentStep} steps={WIZARD_STEPS} />
        </CardContent>
      </Card>

      {/* Step Content */}
      <div>
        {currentStep === 0 && (
          <StepRecipients
            selectedUsers={selectedUsers}
            setSelectedUsers={setSelectedUsers}
            filters={filters}
            setFilters={setFilters}
            onNext={() => goToStep(1)}
          />
        )}

        {currentStep === 1 && (
          <StepCompose
            subject={subject}
            setSubject={setSubject}
            content={content}
            setContent={setContent}
            attachments={attachments}
            setAttachments={setAttachments}
            selectedUsers={selectedUsers}
            onNext={() => goToStep(2)}
            onBack={() => goToStep(0)}
          />
        )}

        {currentStep === 2 && (
          <StepReview
            subject={subject}
            content={content}
            attachments={attachments}
            selectedUsers={selectedUsers}
            filters={filters}
            onBack={() => goToStep(1)}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
}
