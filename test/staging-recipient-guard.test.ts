import assert from "node:assert/strict";
import test from "node:test";
import { assertStagingRecipientAllowed } from "../src/infrastructure/messaging/staging-recipient-guard";

const originalMode = process.env.STAGING_MODE;
const originalAllowed = process.env.STAGING_TWILIO_ALLOWED_RECIPIENTS;

const restoreEnv = () => {
  if (originalMode === undefined) delete process.env.STAGING_MODE;
  else process.env.STAGING_MODE = originalMode;
  if (originalAllowed === undefined) delete process.env.STAGING_TWILIO_ALLOWED_RECIPIENTS;
  else process.env.STAGING_TWILIO_ALLOWED_RECIPIENTS = originalAllowed;
};

test("production does not restrict Twilio recipients", () => {
  try {
    process.env.STAGING_MODE = "false";
    delete process.env.STAGING_TWILIO_ALLOWED_RECIPIENTS;
    assert.doesNotThrow(() => assertStagingRecipientAllowed("+525511223344"));
  } finally {
    restoreEnv();
  }
});

test("staging fails closed without an allowlist", () => {
  try {
    process.env.STAGING_MODE = "true";
    delete process.env.STAGING_TWILIO_ALLOWED_RECIPIENTS;
    assert.throws(() => assertStagingRecipientAllowed("+525511223344"), /not allowlisted/);
  } finally {
    restoreEnv();
  }
});

test("staging accepts only complete allowlisted E.164 numbers", () => {
  try {
    process.env.STAGING_MODE = "true";
    process.env.STAGING_TWILIO_ALLOWED_RECIPIENTS = "+525511223344,+525566778899";
    assert.doesNotThrow(() => assertStagingRecipientAllowed("whatsapp:+525511223344"));
    assert.doesNotThrow(() => assertStagingRecipientAllowed("whatsapp:+5215511223344"));
    assert.throws(() => assertStagingRecipientAllowed("+525511223345"), /not allowlisted/);
    assert.throws(() => assertStagingRecipientAllowed("+5255112233440"), /not allowlisted/);
  } finally {
    restoreEnv();
  }
});
