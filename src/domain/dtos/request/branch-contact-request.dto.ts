import { BranchContactData } from "../../datasources/branch.datasource";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalText = (input: Record<string, unknown>, key: string, maxLength: number): [string | undefined, string | null] => {
  const value = typeof input[key] === "string" ? input[key].trim() : "";
  if (value.length > maxLength) return [`${key} must contain at most ${maxLength} characters.`, null];
  return [undefined, value || null];
};

export class BranchContactRequestDto {
  static create(input: Record<string, unknown>): [string?, BranchContactData?] {
    const [streetError, street] = optionalText(input, "street", 120);
    if (streetError) return [streetError];
    const [exteriorNumberError, exteriorNumber] = optionalText(input, "exteriorNumber", 40);
    if (exteriorNumberError) return [exteriorNumberError];
    const [interiorNumberError, interiorNumber] = optionalText(input, "interiorNumber", 40);
    if (interiorNumberError) return [interiorNumberError];
    const [neighborhoodError, neighborhood] = optionalText(input, "neighborhood", 120);
    if (neighborhoodError) return [neighborhoodError];
    const [cityError, city] = optionalText(input, "city", 120);
    if (cityError) return [cityError];
    const [municipalityError, municipality] = optionalText(input, "municipality", 120);
    if (municipalityError) return [municipalityError];
    const [stateError, state] = optionalText(input, "state", 120);
    if (stateError) return [stateError];
    const [postalCodeError, postalCode] = optionalText(input, "postalCode", 10);
    if (postalCodeError) return [postalCodeError];
    const [countryError, countryValue] = optionalText(input, "country", 80);
    if (countryError) return [countryError];
    const [emailError, email] = optionalText(input, "email", 160);
    if (emailError) return [emailError];
    const [phoneError, phone] = optionalText(input, "phone", 40);
    if (phoneError) return [phoneError];
    const [secondaryPhoneError, secondaryPhone] = optionalText(input, "secondaryPhone", 40);
    if (secondaryPhoneError) return [secondaryPhoneError];

    if (email && !EMAIL_PATTERN.test(email)) return ["email is invalid."];
    if (postalCode && !/^\d{5}$/.test(postalCode)) return ["postalCode must contain 5 digits."];
    if (phone && !BranchContactRequestDto.isValidPhone(phone)) return ["phone is invalid."];
    if (secondaryPhone && !BranchContactRequestDto.isValidPhone(secondaryPhone)) return ["secondaryPhone is invalid."];

    return [
      ,
      {
        street,
        exteriorNumber,
        interiorNumber,
        neighborhood,
        city,
        municipality,
        state,
        postalCode,
        country: countryValue || "México",
        email: email?.toLowerCase() || null,
        phone,
        secondaryPhone,
      },
    ];
  }

  private static isValidPhone(value: string): boolean {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 20;
  }
}
