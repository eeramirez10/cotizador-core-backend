import assert from "node:assert/strict";
import test from "node:test";
import { CreateUserRequestDto } from "../src/domain/dtos/request/create-user-request.dto";
import { UpdateUserRequestDto } from "../src/domain/dtos/request/update-user-request.dto";

const validUser = {
  firstName: "Ana",
  lastName: "Lopez",
  username: "alopez",
  email: "alopez@tuvansa.com.mx",
  password: "Password123",
  role: "SELLER",
  branchCode: "01",
  phone: null,
  erpUserCode: null,
};

test("new users have WhatsApp inbox access enabled by default", () => {
  const [error, dto] = CreateUserRequestDto.create(validUser);

  assert.equal(error, undefined);
  assert.equal(dto?.whatsappInboxEnabled, true);
});

test("new users can be created with WhatsApp inbox access disabled", () => {
  const [error, dto] = CreateUserRequestDto.create({
    ...validUser,
    whatsappInboxEnabled: false,
  });

  assert.equal(error, undefined);
  assert.equal(dto?.whatsappInboxEnabled, false);
});

test("legacy user updates preserve the current WhatsApp inbox access", () => {
  const { password: _password, ...updateInput } = validUser;
  const [error, dto] = UpdateUserRequestDto.create(updateInput);

  assert.equal(error, undefined);
  assert.equal(dto?.whatsappInboxEnabled, undefined);
});
