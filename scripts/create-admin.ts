import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    
    const email = 'admin@noticesboard.com';
    const username = 'admin';
    const password = 'admin123'; // You should change this in production
    const firstName = 'System';
    const lastName = 'Admin';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Updating to ensure admin privileges...');
      
      const updatedUser = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { isAdmin: true },
        select: {
          id: true,
          email: true,
          username: true,
          isAdmin: true,
          createdAt: true
        }
      });
      
      console.log('✅ Admin user updated successfully:');
      console.log(`   ID: ${updatedUser.id}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Username: ${updatedUser.username}`);
      console.log(`   Is Admin: ${updatedUser.isAdmin}`);
      console.log(`   Created: ${updatedUser.createdAt}`);
      return;
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        isAdmin: true,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        createdAt: true
      }
    });

    console.log('✅ Admin user created successfully:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Password: ${password} (please change this)`);
    console.log(`   Is Admin: ${adminUser.isAdmin}`);
    console.log(`   Created: ${adminUser.createdAt}`);
    
    console.log('\n🔐 Login credentials:');
    console.log(`   Email/Username: ${adminUser.email} or ${adminUser.username}`);
    console.log(`   Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdmin();
