const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPermissions() {
    try {
        const count = await prisma.permission.count();
        console.log('Total permissions:', count);

        const first5 = await prisma.permission.findMany({ take: 5 });
        console.log('Sample permissions:', JSON.stringify(first5, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkPermissions();
