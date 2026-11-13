/**
 * Create an administrator account (use this for the first admin).
 *   ADMIN_EMAIL=… ADMIN_NAME="…" npm run db:create-admin
 *
 * A temporary password is generated and printed once (or set ADMIN_PASSWORD).
 * The admin must choose their own password at first sign-in either way.
 */
import { eq } from "drizzle-orm";
import { closeDatabase, openDatabase } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { generateTemporaryPassword, hashPassword } from "@/server/domain/auth";
import { audit } from "@/server/domain/audit";
import { getBook } from "@/server/domain/ledger";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const fullName = process.env.ADMIN_NAME?.trim();
if (!email || !fullName) {
  console.error('Set ADMIN_EMAIL and ADMIN_NAME, e.g. ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name"');
  process.exit(1);
}

const db = await openDatabase();
try {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    console.error(`An account with ${email} already exists.`);
    process.exitCode = 1;
  } else {
    const password = process.env.ADMIN_PASSWORD || generateTemporaryPassword();
    const [admin] = await db
      .insert(users)
      .values({
        fullName,
        email,
        username: email.split("@")[0].replace(/[^a-z0-9]/g, "") || "admin",
        role: "admin",
        status: "active",
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      })
      .returning();
    await audit(db, { actorId: admin.id, subjectUserId: admin.id, action: "account_created" });
    // Make sure the collective book exists (launch price ₦1,000).
    await getBook(db);
    console.log(`Administrator created: ${fullName} <${email}>`);
    if (!process.env.ADMIN_PASSWORD) console.log(`Temporary password (shown once): ${password}`);
    console.log("They will be asked to choose a new password at first sign-in.");
  }
} finally {
  await closeDatabase(db);
}
