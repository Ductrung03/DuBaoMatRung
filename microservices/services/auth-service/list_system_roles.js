const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listSystemRoles() {
    try {
        const roles = await prisma.role.findMany({
            where: { is_system: true }
        });

        console.log('System Roles:', JSON.stringify(roles, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

listSystemRoles();
