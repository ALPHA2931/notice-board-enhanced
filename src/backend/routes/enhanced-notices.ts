import express from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import AudienceTargetingService, { UserAttributes, AudienceRule } from '../services/audienceTargeting';
import NoticeScheduler, { NoticePriority, ScheduledNotice } from '../services/noticeScheduler';
import NoticeStateMachine, { NoticeState, NoticeEvent, UserRole, NoticeContext } from '../services/noticeStateMachine';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Initialize services
const audienceService = new AudienceTargetingService();
const scheduler = new NoticeScheduler();
const stateMachine = new NoticeStateMachine();

// Apply authentication to all notice routes
router.use(authenticate);

// Enhanced validation schemas
const createNoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  priority: z.enum(['EMERGENCY', 'URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  visibleFrom: z.string().datetime().optional(),
  visibleUntil: z.string().datetime().optional(),
  channels: z.array(z.string()).default(['web']),
  audienceRule: z.object({
    departments: z.array(z.string()).default([]),
    roles: z.array(z.string()).default([]),
    locations: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([])
  }).optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  color: z.string().optional(),
});

const updateNoticeSchema = createNoticeSchema.partial();

// User registration for audience targeting
router.post('/register-user', validateRequest(z.object({
  userId: z.string(),
  role: z.string(),
  department: z.string(),
  location: z.string(),
  language: z.string().default('en'),
  deviceCapabilities: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([])
})), async (req, res) => {
  try {
    const userAttributes: UserAttributes = req.body;
    
    // Register user in audience targeting system
    audienceService.registerUser(userAttributes);
    
    res.json({ 
      message: 'User registered successfully in targeting system',
      stats: audienceService.getStats()
    });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ message: 'Failed to register user' });
  }
});

// Create enhanced notice with state machine and scheduling
router.post('/', validateRequest(createNoticeSchema), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role || 'publisher';
    const noticeData = req.body;
    
    // Create notice in database
    const notice = await prisma.notice.create({
      data: {
        id: uuidv4(),
        title: noticeData.title,
        content: noticeData.content,
        color: noticeData.color,
        priority: noticeData.priority,
        isPublic: noticeData.isPublic,
        authorId: userId,
        status: 'DRAFT',
        expiresAt: noticeData.visibleUntil ? new Date(noticeData.visibleUntil) : undefined,
        tags: {
          create: noticeData.tags?.map(tag => ({ name: tag })) || []
        }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        },
        tags: true
      }
    });

    // Initialize in state machine
    const context: NoticeContext = {
      id: notice.id,
      currentState: NoticeState.DRAFT,
      createdAt: notice.createdAt,
      visibleFrom: noticeData.visibleFrom ? new Date(noticeData.visibleFrom) : undefined,
      visibleUntil: noticeData.visibleUntil ? new Date(noticeData.visibleUntil) : undefined,
      priority: getPriorityNumber(noticeData.priority),
      authorId: userId,
      lastModifiedAt: notice.updatedAt
    };
    
    stateMachine.initializeNotice(notice.id, context);

    // Store audience rule if provided
    if (noticeData.audienceRule) {
      const audienceRule: AudienceRule = {
        id: `rule_${notice.id}`,
        expression: JSON.stringify(noticeData.audienceRule),
        departments: noticeData.audienceRule.departments,
        roles: noticeData.audienceRule.roles,
        locations: noticeData.audienceRule.locations,
        tags: noticeData.audienceRule.tags,
        topics: noticeData.audienceRule.topics
      };
      
      audienceService.storeAudienceRule(notice.id, audienceRule);
    }

    res.status(201).json({
      notice,
      state: stateMachine.getCurrentState(notice.id),
      validTransitions: stateMachine.getValidTransitions(notice.id, userRole)
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ message: 'Failed to create notice' });
  }
});

// Submit notice for moderation
router.post('/:id/submit', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role || 'publisher';
    const { id } = req.params;

    // Transition notice state
    const transition = stateMachine.transition(id, {
      event: NoticeEvent.SUBMIT,
      timestamp: new Date(),
      userId,
      userRole
    });

    if (!transition.isValid) {
      return res.status(400).json({ message: transition.reason });
    }

    // Update database
    await prisma.notice.update({
      where: { id },
      data: { status: 'SUBMITTED' }
    });

    res.json({
      message: 'Notice submitted for moderation',
      transition,
      validTransitions: stateMachine.getValidTransitions(id, userRole)
    });
  } catch (error) {
    console.error('Submit notice error:', error);
    res.status(500).json({ message: 'Failed to submit notice' });
  }
});

// Approve notice (moderator only)
router.post('/:id/approve', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role || 'user';
    const { id } = req.params;
    const { scheduledTime } = req.body;

    // First transition to moderation pending
    let transition = stateMachine.transition(id, {
      event: NoticeEvent.APPROVE,
      timestamp: new Date(),
      userId,
      userRole
    });

    if (!transition.isValid) {
      return res.status(400).json({ message: transition.reason });
    }

    // Then approve
    transition = stateMachine.transition(id, {
      event: NoticeEvent.APPROVE,
      timestamp: new Date(),
      userId,
      userRole
    });

    if (!transition.isValid) {
      return res.status(400).json({ message: transition.reason });
    }

    // Update database
    await prisma.notice.update({
      where: { id },
      data: { 
        status: 'APPROVED',
        moderatorId: userId,
        moderatedAt: new Date()
      }
    });

    // Get notice data for scheduling
    const notice = await prisma.notice.findUnique({
      where: { id },
      include: { tags: true }
    });

    if (notice) {
      // Find eligible audience
      const audienceRule = audienceService.getAudienceRule(id);
      let targetAudience: string[] = [];
      
      if (audienceRule) {
        targetAudience = audienceService.findEligibleUsers(audienceRule);
      } else if (notice.isPublic) {
        // For public notices, get all registered users
        const stats = audienceService.getStats();
        // In a real implementation, you'd get all user IDs
        targetAudience = ['all-users'];
      }

      // Create scheduled notice
      const scheduledNotice: ScheduledNotice = {
        noticeId: notice.id,
        title: notice.title,
        content: notice.content,
        priority: getPriorityEnum(notice.priority),
        visibleFrom: scheduledTime ? new Date(scheduledTime) : new Date(),
        visibleUntil: notice.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
        targetAudience,
        channels: ['web'], // Could be extended
        createdAt: notice.createdAt,
        retryCount: 0,
        maxRetries: 3
      };

      // Schedule the notice
      scheduler.scheduleNotice(scheduledNotice);

      // Transition to scheduled state
      stateMachine.transition(id, {
        event: NoticeEvent.SCHEDULE,
        timestamp: new Date(),
        userId: 'system',
        userRole: 'system',
        metadata: { scheduledTime: scheduledNotice.visibleFrom }
      });

      await prisma.notice.update({
        where: { id },
        data: { status: 'SCHEDULED' }
      });
    }

    res.json({
      message: 'Notice approved and scheduled',
      transition,
      validTransitions: stateMachine.getValidTransitions(id, userRole),
      targetAudienceSize: targetAudience?.length || 0
    });
  } catch (error) {
    console.error('Approve notice error:', error);
    res.status(500).json({ message: 'Failed to approve notice' });
  }
});

// Reject notice (moderator only)
router.post('/:id/reject', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role || 'user';
    const { id } = req.params;
    const { reason } = req.body;

    const transition = stateMachine.transition(id, {
      event: NoticeEvent.REJECT,
      timestamp: new Date(),
      userId,
      userRole,
      metadata: { reason }
    });

    if (!transition.isValid) {
      return res.status(400).json({ message: transition.reason });
    }

    await prisma.notice.update({
      where: { id },
      data: { 
        status: 'REJECTED',
        moderatorId: userId,
        moderatedAt: new Date()
      }
    });

    res.json({
      message: 'Notice rejected',
      transition,
      validTransitions: stateMachine.getValidTransitions(id, userRole)
    });
  } catch (error) {
    console.error('Reject notice error:', error);
    res.status(500).json({ message: 'Failed to reject notice' });
  }
});

// Get active notices for display
router.get('/display/:displayId', async (req, res) => {
  try {
    const { displayId } = req.params;
    const userId = (req as any).user.userId;

    // Get notices from scheduler
    const displayNotices = scheduler.getDisplayNotices(displayId);
    
    // Filter based on user's eligibility and seen status
    const eligibleNotices = displayNotices.filter(notice => {
      // Check if user has seen this notice (Bloom filter check)
      const hasSeenNotice = audienceService.hasUserSeenNotice(userId, notice.noticeId);
      
      // Include if not seen or if it's an emergency
      return !hasSeenNotice || notice.priority === NoticePriority.EMERGENCY;
    });

    // Mark notices as seen
    eligibleNotices.forEach(notice => {
      audienceService.markNoticeSeen(userId, notice.noticeId);
    });

    res.json({
      notices: eligibleNotices,
      displayId,
      timestamp: new Date(),
      stats: {
        totalNotices: displayNotices.length,
        eligibleNotices: eligibleNotices.length,
        schedulerStats: scheduler.getStats()
      }
    });
  } catch (error) {
    console.error('Display notices error:', error);
    res.status(500).json({ message: 'Failed to fetch display notices' });
  }
});

// Emergency notice (immediate activation)
router.post('/:id/emergency', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role || 'user';
    const { id } = req.params;

    if (userRole !== UserRole.ADMIN) {
      return res.status(403).json({ message: 'Only admins can create emergency notices' });
    }

    const notice = await prisma.notice.findUnique({
      where: { id },
      include: { tags: true }
    });

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Create emergency scheduled notice
    const emergencyNotice: ScheduledNotice = {
      noticeId: notice.id,
      title: notice.title,
      content: notice.content,
      priority: NoticePriority.EMERGENCY,
      visibleFrom: new Date(),
      visibleUntil: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      targetAudience: ['all-users'], // Emergency goes to everyone
      channels: ['web', 'mobile', 'display'],
      createdAt: notice.createdAt,
      retryCount: 0,
      maxRetries: 5 // More retries for emergency
    };

    // Preempt with emergency
    scheduler.preemptWithEmergency(emergencyNotice);

    // Update state machine
    stateMachine.transition(id, {
      event: NoticeEvent.ACTIVATE,
      timestamp: new Date(),
      userId,
      userRole,
      metadata: { emergency: true }
    });

    await prisma.notice.update({
      where: { id },
      data: { 
        status: 'ACTIVE',
        priority: 'EMERGENCY'
      }
    });

    res.json({
      message: 'Emergency notice activated',
      notice: emergencyNotice,
      schedulerStats: scheduler.getStats()
    });
  } catch (error) {
    console.error('Emergency notice error:', error);
    res.status(500).json({ message: 'Failed to activate emergency notice' });
  }
});

// Get system statistics and health
router.get('/system/stats', async (req, res) => {
  try {
    const stats = {
      audienceTargeting: audienceService.getStats(),
      scheduler: scheduler.getStats(),
      stateMachine: stateMachine.getSystemStats(),
      timestamp: new Date()
    };

    res.json(stats);
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({ message: 'Failed to fetch system stats' });
  }
});

// Get FSM visualization
router.get('/system/fsm-graph', async (req, res) => {
  try {
    const dotGraph = stateMachine.exportToDOT();
    
    res.json({
      dotGraph,
      validation: stateMachine.validateFSM(),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('FSM graph error:', error);
    res.status(500).json({ message: 'Failed to generate FSM graph' });
  }
});

// Search notices by tags using inverted index
router.get('/search', async (req, res) => {
  try {
    const { tags, users } = req.query;
    let results = [];

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      const userIds = audienceService.searchUsersByTag(tagArray as string[]);
      results = userIds;
    }

    if (users) {
      const userArray = Array.isArray(users) ? users : [users];
      const userIds = audienceService.searchUsersByTag(userArray as string[]);
      results = [...new Set([...results, ...userIds])]; // Union
    }

    res.json({
      results,
      query: { tags, users },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Failed to search' });
  }
});

// Helper functions
function getPriorityNumber(priority: string): number {
  const mapping: { [key: string]: number } = {
    'EMERGENCY': 0,
    'URGENT': 1,
    'HIGH': 2,
    'NORMAL': 3,
    'LOW': 4
  };
  return mapping[priority] || 3;
}

function getPriorityEnum(priority: string): NoticePriority {
  const mapping: { [key: string]: NoticePriority } = {
    'EMERGENCY': NoticePriority.EMERGENCY,
    'URGENT': NoticePriority.URGENT,
    'HIGH': NoticePriority.HIGH,
    'NORMAL': NoticePriority.NORMAL,
    'LOW': NoticePriority.LOW
  };
  return mapping[priority] || NoticePriority.NORMAL;
}

export { router as enhancedNoticesRouter };
