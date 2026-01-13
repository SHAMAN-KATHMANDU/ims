import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function checkOrCreateSuperAdmin() {
  try {
    console.log("🔍 Checking for superadmin user...");

    const username = "superadmin";
    const password = "superadmin123";

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      console.log("✅ User already exists!");
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   ID: ${existingUser.id}`);

      // Test password
      const isMatch = await bcrypt.compare(password, existingUser.password);
      console.log(`   Password match: ${isMatch ? "✅ YES" : "❌ NO"}`);

      if (!isMatch) {
        console.log("\n⚠️  Password does not match! Resetting password...");
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { password: hashedPassword },
        });
        console.log("✅ Password reset successfully!");
      }
    } else {
      console.log("❌ User not found. Creating...");
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          role: "superAdmin",
        },
      });

      console.log("✅ User created successfully!");
      console.log(`   Username: ${newUser.username}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   Password: ${password}`);
    }

    console.log("\n📝 Login credentials:");
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrCreateSuperAdmin();
