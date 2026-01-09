const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteSystemRoles() {
    try {
        // First list them to be sure
        const roles = await prisma.role.findMany({
            where: { is_system: true },
            select: { id: true, name: true }
        });
        console.log('Roles to delete:', roles);

        // Now delete them
        const { count } = await prisma.role.deleteMany({
            where: { is_system: true }
        });

        console.log(`Deleted ${count} system roles.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

deleteSystemRoles();
