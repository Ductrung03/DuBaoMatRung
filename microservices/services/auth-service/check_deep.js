const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeepQuery() {
    try {
        const user = await prisma.user.findFirst({
            where: { username: 'admin' },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (user) {
            console.log('User found:', user.username);
            console.log('Roles:', user.userRoles.length);
            const firstRole = user.userRoles[0]?.role;
            if (firstRole) {
                console.log('First Role:', firstRole.name);
                console.log('Permissions count:', firstRole.rolePermissions.length);
            }
        } else {
            console.log('User not found');
        }
    } catch (error) {
        console.error('Deep query failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDeepQuery();
