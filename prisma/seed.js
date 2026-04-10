require("dotenv").config();

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_ADMIN = {
  name: "Inventra Admin",
  email: "admin@inventra.com",
  password: "admin123",
  role: "admin"
};

const SALT_ROUNDS = 12;

async function seedDefaultAdmin() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: DEFAULT_ADMIN.role },
    select: { id: true, email: true }
  });

  if (existingAdmin) {
    console.log(`Admin already exists (${existingAdmin.email}). Skipping seed.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, SALT_ROUNDS);

  const adminUser = await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN.email },
    update: {
      name: DEFAULT_ADMIN.name,
      password: hashedPassword,
      role: DEFAULT_ADMIN.role
    },
    create: {
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      password: hashedPassword,
      role: DEFAULT_ADMIN.role
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  console.log("Default admin is ready:", adminUser);
}

seedDefaultAdmin()
  .catch((error) => {
    console.error("Failed to seed default admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
