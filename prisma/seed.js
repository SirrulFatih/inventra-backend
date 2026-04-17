require("dotenv").config();

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PERMISSIONS = [
  "view_dashboard",
  "read_items",
  "manage_items",
  "read_transactions",
  "manage_transactions",
  "approve_transactions",
  "read_audit_logs",
  "manage_users",
  "manage_roles"
];

const ROLES = ["admin", "admin_operasional", "staff", "viewer"];

const ROLE_PERMISSION_MAP = {
  admin: PERMISSIONS,
  admin_operasional: [
    "view_dashboard",
    "read_items",
    "manage_items",
    "read_transactions",
    "manage_transactions",
    "approve_transactions",
    "read_audit_logs"
  ],
  staff: ["view_dashboard", "read_items", "read_transactions", "manage_transactions"],
  viewer: ["view_dashboard", "read_items", "read_transactions", "read_audit_logs"]
};

const DEFAULT_ADMIN = {
  name: "Inventra Admin",
  email: "admin@inventra.com",
  password: "admin123",
  role: "admin"
};

const SALT_ROUNDS = 12;

async function seedPermissionsAndRoles() {
  const permissions = await Promise.all(
    PERMISSIONS.map((permissionName) =>
      prisma.permission.upsert({
        where: { name: permissionName },
        update: { name: permissionName },
        create: { name: permissionName }
      })
    )
  );

  const roles = await Promise.all(
    ROLES.map((roleName) =>
      prisma.role.upsert({
        where: { name: roleName },
        update: { name: roleName },
        create: { name: roleName }
      })
    )
  );

  const roleByName = new Map(roles.map((role) => [role.name, role]));
  const permissionByName = new Map(permissions.map((permission) => [permission.name, permission]));

  const rolePermissionUpserts = [];

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = roleByName.get(roleName);

    if (!role) {
      throw new Error(`Role '${roleName}' is missing while seeding role-permissions`);
    }

    for (const permissionName of permissionNames) {
      const permission = permissionByName.get(permissionName);

      if (!permission) {
        throw new Error(`Permission '${permissionName}' is missing while seeding role-permissions`);
      }

      rolePermissionUpserts.push(
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id
          }
        })
      );
    }
  }

  await Promise.all(rolePermissionUpserts);

  return {
    roleByName
  };
}

async function seedDefaultAdmin(roleByName) {
  const adminRole = roleByName.get(DEFAULT_ADMIN.role);

  if (!adminRole) {
    throw new Error(`Default admin role '${DEFAULT_ADMIN.role}' does not exist`);
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { roleId: adminRole.id },
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
      roleId: adminRole.id
    },
    create: {
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      password: hashedPassword,
      roleId: adminRole.id
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      role: {
        select: {
          name: true
        }
      }
    }
  });

  console.log("Default admin is ready:", {
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role.name,
    createdAt: adminUser.createdAt
  });
}

async function main() {
  const { roleByName } = await seedPermissionsAndRoles();
  await seedDefaultAdmin(roleByName);
}

main()
  .catch((error) => {
    console.error("Failed to seed RBAC data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
