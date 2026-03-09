import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";

  console.log(`Creating admin user: ${adminEmail}`);

  // 1. Create auth user via Supabase Admin API
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

  if (authError) {
    // If user already exists, that's okay
    if (authError.message.includes("already been registered")) {
      console.log("Admin user already exists, skipping creation.");
      return;
    }
    throw new Error(`Failed to create admin user: ${authError.message}`);
  }

  const userId = authData.user.id;
  console.log(`Admin user created with ID: ${userId}`);

  // 2. Insert user_roles record (user_roles table is managed by Supabase SQL, not Prisma)
  const { error: insertRoleError } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role: "admin" });

  if (insertRoleError) {
    console.error(
      `Warning: Failed to insert user_roles record: ${insertRoleError.message}`
    );
    console.log(
      "You may need to run the RBAC SQL migration first and then re-run the seed."
    );
  } else {
    console.log("Admin role assigned.");
  }

  // 3. Create Profile record via Prisma
  await prisma.profile.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      fullName: "System Admin",
    },
  });

  console.log("Admin profile created.");
  console.log("\nSeed completed successfully!");
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
