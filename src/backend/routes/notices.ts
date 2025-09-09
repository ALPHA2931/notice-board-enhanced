import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Apply authentication to all notice routes
router.use(authenticate);

// Validation schemas
const createNoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  color: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  isPublic: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().transform(str => str ? new Date(str) : undefined),
  tags: z.array(z.string()).optional(),
});

const updateNoticeSchema = createNoticeSchema.partial();

const shareNoticeSchema = z.object({
  userIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  permission: z.enum(['READ', 'WRITE', 'ADMIN']).optional(),
});

// Get all notices for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { status, priority, isPublic } = req.query;

    const notices = await prisma.notice.findMany({
      where: {
        AND: [
          {
            OR: [
              { authorId: userId },
              { isPublic: true },
              {
                shares: {
                  some: {
                    OR: [
                      { userId },
                      {
                        group: {
                          members: {
                            some: { userId }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            ]
          },
          status ? { status: status as any } : {},
          priority ? { priority: priority as any } : {},
          isPublic !== undefined ? { isPublic: isPublic === 'true' } : {},
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        },
        tags: true,
        shares: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              }
            },
            group: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5, // Limit initial comments
        },
        _count: {
          select: {
            comments: true,
            shares: true,
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ notices });
  } catch (error) {
    console.error('Fetch notices error:', error);
    res.status(500).json({ message: 'Failed to fetch notices' });
  }
});

// Get a single notice by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const notice = await prisma.notice.findFirst({
      where: {
        id,
        OR: [
          { authorId: userId },
          { isPublic: true },
          {
            shares: {
              some: {
                OR: [
                  { userId },
                  {
                    group: {
                      members: {
                        some: { userId }
                      }
                    }
                  }
                ]
              }
            }
          }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        },
        tags: true,
        shares: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              }
            },
            group: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    res.json({ notice });
  } catch (error) {
    console.error('Fetch notice error:', error);
    res.status(500).json({ message: 'Failed to fetch notice' });
  }
});

// Create a new notice
router.post('/', validateRequest(createNoticeSchema), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { title, content, color, priority, isPublic, expiresAt, tags } = req.body;

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        color,
        priority,
        isPublic,
        expiresAt,
        authorId: userId,
        tags: tags ? {
          create: tags.map((tag: string) => ({ name: tag }))
        } : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        },
        tags: true,
      }
    });

    res.status(201).json({ notice });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ message: 'Failed to create notice' });
  }
});

// Update a notice
router.put('/:id', validateRequest(updateNoticeSchema), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { title, content, color, priority, isPublic, expiresAt, tags } = req.body;

    // Check if user owns the notice or has write permission
    const existingNotice = await prisma.notice.findFirst({
      where: {
        id,
        OR: [
          { authorId: userId },
          {
            shares: {
              some: {
                AND: [
                  { userId },
                  { permission: { in: ['WRITE', 'ADMIN'] } }
                ]
              }
            }
          }
        ]
      }
    });

    if (!existingNotice) {
      return res.status(404).json({ message: 'Notice not found or access denied' });
    }

    const notice = await prisma.notice.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(color !== undefined && { color }),
        ...(priority !== undefined && { priority }),
        ...(isPublic !== undefined && { isPublic }),
        ...(expiresAt !== undefined && { expiresAt }),
        ...(tags && {
          tags: {
            deleteMany: {},
            create: tags.map((tag: string) => ({ name: tag }))
          }
        }),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        },
        tags: true,
      }
    });

    res.json({ notice });
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({ message: 'Failed to update notice' });
  }
});

// Delete a notice
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    // Check if user owns the notice
    const notice = await prisma.notice.findFirst({
      where: {
        id,
        authorId: userId,
      }
    });

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found or access denied' });
    }

    await prisma.notice.delete({ where: { id } });

    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ message: 'Failed to delete notice' });
  }
});

// Share a notice with users or groups
router.post('/:id/share', validateRequest(shareNoticeSchema), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { userIds, groupIds, permission = 'READ' } = req.body;

    // Check if user owns the notice or has admin permission
    const notice = await prisma.notice.findFirst({
      where: {
        id,
        OR: [
          { authorId: userId },
          {
            shares: {
              some: {
                AND: [
                  { userId },
                  { permission: 'ADMIN' }
                ]
              }
            }
          }
        ]
      }
    });

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found or access denied' });
    }

    const shares = [];

    // Share with users
    if (userIds?.length) {
      for (const shareUserId of userIds) {
        const share = await prisma.noticeShare.upsert({
          where: {
            noticeId_userId: {
              noticeId: id,
              userId: shareUserId
            }
          },
          update: { permission },
          create: {
            noticeId: id,
            userId: shareUserId,
            permission
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        });
        shares.push(share);
      }
    }

    // Share with groups
    if (groupIds?.length) {
      for (const groupId of groupIds) {
        const share = await prisma.noticeShare.upsert({
          where: {
            noticeId_groupId: {
              noticeId: id,
              groupId: groupId
            }
          },
          update: { permission },
          create: {
            noticeId: id,
            groupId: groupId,
            permission
          },
          include: {
            group: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        });
        shares.push(share);
      }
    }

    res.json({ shares });
  } catch (error) {
    console.error('Share notice error:', error);
    res.status(500).json({ message: 'Failed to share notice' });
  }
});

// Add comment to a notice
router.post('/:id/comments', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    // Check if user has access to the notice
    const notice = await prisma.notice.findFirst({
      where: {
        id,
        OR: [
          { authorId: userId },
          { isPublic: true },
          {
            shares: {
              some: {
                OR: [
                  { userId },
                  {
                    group: {
                      members: {
                        some: { userId }
                      }
                    }
                  }
                ]
              }
            }
          }
        ]
      }
    });

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found or access denied' });
    }

    const comment = await prisma.noticeComment.create({
      data: {
        content: content.trim(),
        noticeId: id,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        }
      }
    });

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

export { router as noticeRoutes };
