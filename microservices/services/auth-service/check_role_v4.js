const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst({
            where: { username: 'admin' },
            include: {
                userRoles: {
                    include: {
                        role: true
                    }
                }
            }
        });

        if (user) {
            console.log('Username:', user.username);
            console.log('Roles:', JSON.stringify(user.userRoles.map(ur => ur.role), null, 2));
        } else {
            console.log('User not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
