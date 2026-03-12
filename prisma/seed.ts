import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  console.log('=== Database Reset ===\n');

  // 1. Delete all data (order respects foreign keys)
  console.log('Clearing all data...');

  const auditLogs = await prisma.auditLog.deleteMany();
  console.log(`  Deleted ${auditLogs.count} audit logs`);

  const salesLines = await prisma.salesLine.deleteMany();
  console.log(`  Deleted ${salesLines.count} sales lines`);

  const salesUploads = await prisma.salesUpload.deleteMany();
  console.log(`  Deleted ${salesUploads.count} sales uploads`);

  const transactions = await prisma.inventoryTransaction.deleteMany();
  console.log(`  Deleted ${transactions.count} inventory transactions`);

  const recipes = await prisma.recipeIngredient.deleteMany();
  console.log(`  Deleted ${recipes.count} recipe ingredients`);

  const items = await prisma.item.deleteMany();
  console.log(`  Deleted ${items.count} items`);

  // 2. Delete all non-admin Supabase auth users
  console.log('\nCleaning up auth users...');

  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (listError) {
    console.error(`  Warning: Could not list auth users: ${listError.message}`);
  } else {
    const nonAdminUsers = listData.users.filter((u) => u.email !== adminEmail);

    for (const user of nonAdminUsers) {
      // Delete profile first
      await prisma.profile.delete({ where: { id: user.id } }).catch(() => {});

      // Delete user_roles via Supabase
      await supabase.from('user_roles').delete().eq('user_id', user.id);

      // Delete auth user
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(
          `  Warning: Could not delete user ${user.email}: ${error.message}`
        );
      } else {
        console.log(`  Deleted user: ${user.email}`);
      }
    }

    if (nonAdminUsers.length === 0) {
      console.log('  No non-admin users to delete.');
    }
  }

  // 3. Ensure admin account exists
  console.log(`\nEnsuring admin account: ${adminEmail}`);

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true
    });

  let adminId: string;

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('  Admin auth user already exists.');
      const existing = listData?.users.find((u) => u.email === adminEmail);
      if (!existing) {
        throw new Error('Admin user exists in auth but could not find ID');
      }
      adminId = existing.id;
    } else {
      throw new Error(`Failed to create admin user: ${authError.message}`);
    }
  } else {
    adminId = authData.user.id;
    console.log(`  Admin auth user created with ID: ${adminId}`);
  }

  // 4. Ensure admin role
  await supabase.from('user_roles').delete().eq('user_id', adminId);
  const { error: insertRoleError } = await supabase
    .from('user_roles')
    .insert({ user_id: adminId, role: 'admin' });

  if (insertRoleError) {
    console.error(
      `  Warning: Could not insert admin role: ${insertRoleError.message}`
    );
  } else {
    console.log('  Admin role ensured.');
  }

  // 5. Ensure admin profile
  await prisma.profile.upsert({
    where: { id: adminId },
    update: {},
    create: {
      id: adminId,
      fullName: 'System Admin'
    }
  });
  console.log('  Admin profile ensured.');

  console.log('\n=== Reset complete ===');
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
