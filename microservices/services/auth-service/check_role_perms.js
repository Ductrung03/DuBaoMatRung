const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRolePermissions() {
    try {
        const role = await prisma.role.findFirst({
            where: { name: 'Công ty Fis' },
            include: {
                rolePermissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });

        if (role) {
            console.log('Role:', role.name);
            console.log('Permissions count:', role.rolePermissions.length);
            console.log('Permissions:', role.rolePermissions.map(rp => rp.permission.code).join(', '));
        } else {
            console.log('Role not found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRolePermissions();
