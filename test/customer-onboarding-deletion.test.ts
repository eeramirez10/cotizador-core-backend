import assert from "node:assert/strict";
import test from "node:test";
import { CustomerOnboardingUseCase, canDeleteUnlinkedOnboarding, canEditCustomerOnboarding, statusAfterOnboardingEdit } from "../src/domain/use-cases/customer-onboarding.use-case";

test("credit and collections may edit only pending review data without leaving their queue", () => {
  assert.equal(canEditCustomerOnboarding("CREDIT_COLLECTIONS", "PENDING_CXC"), true);
  assert.equal(canEditCustomerOnboarding("CREDIT_COLLECTIONS", "READY_FOR_ERP"), false);
  assert.equal(canEditCustomerOnboarding("CREDIT_COLLECTIONS", "ERP_LINKED"), false);
  assert.equal(canEditCustomerOnboarding("SELLER", "PENDING_CXC"), false);
  assert.equal(statusAfterOnboardingEdit("PENDING_CXC", false), "PENDING_CXC");
  assert.equal(statusAfterOnboardingEdit("PENDING_CXC", true), "PENDING_CXC");
  assert.equal(statusAfterOnboardingEdit("COLLECTING", false), "PENDING_REVIEW");
});

test("unlinked fiscal onboardings can be deleted, including ready for ERP", () => {
  for (const status of ["COLLECTING", "PENDING_REVIEW", "PENDING_CXC", "REJECTED", "READY_FOR_ERP", "COMPLETED", "CANCELLED"] as const) {
    assert.equal(canDeleteUnlinkedOnboarding(status), true, status);
  }
  assert.equal(canDeleteUnlinkedOnboarding("ERP_LINKED"), false);
});

test("credit and collections cannot delete a fiscal onboarding", async () => {
  const useCase = new CustomerOnboardingUseCase();
  await assert.rejects(
    () => useCase.deleteUnlinked("onboarding-1", "ELIMINAR", {
      id: "user-1",
      role: "CREDIT_COLLECTIONS",
      branchId: "branch-1",
    }),
    /CUSTOMER_ONBOARDING_DELETE_ADMIN_REQUIRED/,
  );
});
