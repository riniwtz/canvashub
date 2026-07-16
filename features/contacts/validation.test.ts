import assert from "node:assert/strict";
import test from "node:test";

import {
  mapContactValidationErrors,
  validateContactFormData,
} from "./validation";
import { calculateAge } from "./age";

test("turns empty optional contact fields into undefined", () => {
  const formData = createMinimumContactForm();
  formData.set("nickname", "  ");
  formData.set("age", "");
  formData.set("birthday", "");
  formData.set("phone", "");

  const result = validateContactFormData(formData);

  assert.deepEqual(result.success ? result.data : null, {
    name: "Student Hub",
    nickname: undefined,
    age: undefined,
    birthday: undefined,
    phone: undefined,
    socialLinks: [],
  });
});

test("does not coerce an empty age to zero", () => {
  const formData = createMinimumContactForm();
  formData.set("age", "");

  const result = validateContactFormData(formData);

  assert.equal(result.success ? result.data.age : "invalid", undefined);
});

test("rejects a future birthday", () => {
  const formData = createMinimumContactForm();
  formData.set("birthday", "2999-01-01");

  const result = validateContactFormData(formData);

  assert.equal(result.success, false);
});

test("rejects an age that does not match the birthday", () => {
  const formData = createMinimumContactForm();
  const birthday = "2000-01-01";
  const calculatedAge = getCalculatedAge(birthday);

  formData.set("birthday", birthday);
  formData.set("age", String(calculatedAge + 1));

  const result = validateContactFormData(formData);

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.deepEqual(mapContactValidationErrors(result.error), {
    fieldErrors: {
      age: ["Age is not accurate for the selected birthday."],
    },
    socialLinkErrors: {},
  });
});

test("accepts the age calculated from the birthday", () => {
  const formData = createMinimumContactForm();
  const birthday = "2000-01-01";
  const calculatedAge = getCalculatedAge(birthday);

  formData.set("birthday", birthday);
  formData.set("age", String(calculatedAge));

  const result = validateContactFormData(formData);

  assert.equal(result.success, true);
});

test("maps a social URL error to its exact row and field", () => {
  const formData = createMinimumContactForm();
  formData.append("socialPlatform", "instagram");
  formData.append("socialValue", "https://instagram.com.evil.test/studenthub");

  const result = validateContactFormData(formData);
  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.deepEqual(mapContactValidationErrors(result.error), {
    fieldErrors: {},
    socialLinkErrors: {
      "0": {
        value: ["This link does not match Instagram."],
      },
    },
  });
});

test("normalizes repeated social form fields in row order", () => {
  const formData = createMinimumContactForm();
  formData.append("socialPlatform", "instagram");
  formData.append("socialPlatform", "tiktok");
  formData.append("socialValue", "student.hub");
  formData.append("socialValue", "@studenthub");

  const result = validateContactFormData(formData);

  assert.deepEqual(result.success ? result.data.socialLinks : null, [
    {
      platform: "instagram",
      url: "https://www.instagram.com/student.hub",
    },
    {
      platform: "tiktok",
      url: "https://www.tiktok.com/@studenthub",
    },
  ]);
});

function createMinimumContactForm() {
  const formData = new FormData();
  formData.set("name", "  Student Hub  ");
  return formData;
}

function getCalculatedAge(birthday: string) {
  const calculatedAge = calculateAge(birthday);

  if (calculatedAge === null) {
    throw new Error("Expected a valid birthday.");
  }

  return calculatedAge;
}
