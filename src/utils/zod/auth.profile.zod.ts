import { z } from "zod";

export const indianPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, ""))
  .transform((v) => {
    if (v.startsWith("+91")) return v.slice(3);
    if (v.startsWith("91") && v.length === 12) return v.slice(2);
    return v;
  })
  .refine((v) => v === "" || /^[6-9]\d{9}$/.test(v), {
    message: "Enter a valid 10-digit Indian mobile number",
  });

const profilePhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, ""))
  .refine((v) => v !== "" && v !== "+91", {
    message: "Phone number is required",
  })
  .refine((v) => /^\+91[6-9]\d{9}$/.test(v), {
    message: "Enter +91 followed by a valid 10-digit mobile number",
  })
  .transform((v) => v.slice(3));

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

function requiredText(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);
}

export const profileUpdateSchema = z
  .object({
    first_name: requiredText("First name", 100),
    last_name: requiredText("Last name", 100),
    phone: profilePhoneSchema,

    address_line_1: requiredText("Address line 1", 255),
    address_line_2: requiredText("Address line 2", 255),
    landmark: requiredText("Landmark", 255),
    city: requiredText("City", 100),
    state: requiredText("State", 100),
    postal_code: z
      .string()
      .trim()
      .min(1, "Postal code is required")
      .refine((v) => PINCODE_REGEX.test(v), {
        message: "Enter a valid 6-digit pincode",
      }),

    company_name: z.string().trim().max(255).optional().default(""),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || GSTIN_REGEX.test(v), {
        message: "Enter a valid 15-character GSTIN",
      })
      .optional()
      .default(""),

    currentPassword: z.string().max(200).optional().default(""),
    newPassword: z
      .string()
      .max(200, "Password is too long")
      .optional()
      .default(""),
    confirmPassword: z.string().max(200).optional().default(""),
  })
  .superRefine((data, ctx) => {
    const wantsChange =
      data.currentPassword.length > 0 ||
      data.newPassword.length > 0 ||
      data.confirmPassword.length > 0;

    if (!wantsChange) return;

    if (!data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password is required",
      });
      return;
    }

    if (data.newPassword.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Password must be at least 8 characters",
      });
      return;
    }

    if (!data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Please confirm your new password",
      });
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;
export type ProfileUpdateData = z.output<typeof profileUpdateSchema>;
