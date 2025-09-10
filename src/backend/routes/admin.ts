import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Get all users (admin only)
router.get('/users', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notices: true,
            noticeComments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user by ID (admin only)
router.get('/users/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        notices: {
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            notices: true,
            noticeComments: true,
            groups: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Update user (admin only)
router.put('/users/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, username, firstName, lastName, isActive, isAdmin } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        username,
        firstName,
        lastName,
        isActive,
        isAdmin
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isAdmin: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Email or username already exists' });
    } else {
      res.status(500).json({ message: 'Failed to update user' });
    }
  }
});

// Delete user (admin only)
router.delete('/users/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user?.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Get system statistics (admin only)
router.get('/stats', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalNotices,
      activeNotices,
      urgentNotices,
      totalComments,
      totalGroups
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.notice.count(),
      prisma.notice.count({ where: { status: 'ACTIVE' } }),
      prisma.notice.count({ where: { priority: 'URGENT', status: 'ACTIVE' } }),
      prisma.noticeComment.count(),
      prisma.group.count()
    ]);

    // Get recent activity
    const recentNotices = await prisma.notice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        priority: true,
        createdAt: true,
        author: {
          select: {
            username: true
          }
        }
      }
    });

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      }
    });

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        inactive: totalUsers - activeUsers
      },
      notices: {
        total: totalNotices,
        active: activeNotices,
        urgent: urgentNotices,
        archived: totalNotices - activeNotices
      },
      engagement: {
        totalComments,
        totalGroups,
        avgNoticesPerUser: totalUsers > 0 ? Math.round(totalNotices / totalUsers * 100) / 100 : 0
      },
      recent: {
        notices: recentNotices,
        users: recentUsers
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Create new admin user (admin only)
router.post('/users', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, username, password, firstName, lastName, isAdmin = false } = req.body;

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        isAdmin
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isAdmin: true,
        createdAt: true
      }
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Email or username already exists' });
    } else {
      res.status(500).json({ message: 'Failed to create user' });
    }
  }
});

// Get all notices with admin details (admin only)
router.get('/notices', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const notices = await prisma.notice.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        _count: {
          select: {
            comments: true,
            shares: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(notices);
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ message: 'Failed to fetch notices' });
  }
});

// Delete any notice (admin only)
router.delete('/notices/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.notice.delete({
      where: { id }
    });

    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ message: 'Failed to delete notice' });
  }
});

export default router;
