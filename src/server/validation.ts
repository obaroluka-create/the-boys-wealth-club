import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

const nairaAmount = z
  .number("Enter an amount.")
  .finite()
  .positive("Enter an amount greater than zero.")
  .max(100_000_000_000, "That amount is too large.");

const accountStatus = z.enum(["active", "disabled", "pending"]);

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username.").max(320),
  password: z.string().min(1, "Enter your password.").max(256),
  rememberMe: z.boolean().optional(),
});

export const passwordResetSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email.").max(320),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(256),
  newPassword: z.string().max(256),
});

export const userQuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(["all", "active", "disabled", "pending"]).optional(),
  sortBy: z.enum(["name", "investment", "balance"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const createUserSchema = z.object({
  id: z.guid().optional(),
  fullName: z.string().trim().min(1, "Full name is required.").max(200),
  email,
  totalDeposit: nairaAmount,
  status: accountStatus,
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(200).optional(),
  email: email.optional(),
  status: accountStatus.optional(),
  imageUrl: z.string().optional(),
});

export const statusSchema = z.object({ status: accountStatus });

export const depositSchema = z.object({
  amount: nairaAmount,
  note: z.string().trim().max(200).optional(),
});

export const dividendSchema = z.object({
  amount: nairaAmount,
  type: z.enum(["quarterly", "special", "annual"]).optional(),
});

const percent = z.number("Enter a percentage.").finite().min(0).max(1000);

export const bookUpdateSchema = z.object({
  profitPercent: percent,
  lossPercent: percent,
});

export const rangeSchema = z.object({
  range: z.enum(["1M", "3M", "6M", "1Y", "ALL"]).optional(),
});

export const uuidParam = z.guid();
