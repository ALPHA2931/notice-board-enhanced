import cron from 'node-cron';

// Priority levels for notices
enum NoticePriority {
  EMERGENCY = 0,  // Highest priority
  URGENT = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4
}

// Notice scheduling item
interface ScheduledNotice {
  noticeId: string;
  title: string;
  content: string;
  priority: NoticePriority;
  visibleFrom: Date;
  visibleUntil: Date;
  targetAudience: string[];
  channels: string[];
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
}

// Delivery status tracking
interface DeliveryCheckpoint {
  targetId: string;
  noticeVersionId: string;
  status: 'pending' | 'delivered' | 'failed' | 'expired';
  lastAttemptAt: Date;
  attempts: number;
  nextRetryAt?: Date;
}

// Interval for managing time windows
interface TimeInterval {
  start: Date;
  end: Date;
  noticeId: string;
  isBlackout?: boolean;
}

class NoticeScheduler {
  // Priority queue implemented as binary heap
  private dispatchQueue: ScheduledNotice[] = [];
  
  // Active notices by time window
  private activeNotices: Map<string, ScheduledNotice> = new Map();
  
  // Delivery checkpoints
  private deliveryCheckpoints: Map<string, DeliveryCheckpoint[]> = new Map();
  
  // Time intervals for blackout periods and overlaps
  private timeIntervals: TimeInterval[] = [];
  
  // Circular buffer for high-frequency events (per-display frame pipeline)
  private displayBuffers: Map<string, ScheduledNotice[]> = new Map();
  private bufferSize = 100;
  
  // Timing wheel for efficient timer management
  private timerWheel: Map<number, ScheduledNotice[]> = new Map();
  private currentTick = 0;
  
  // Cron jobs for scheduling
  private schedulerJob: any;
  private cleanupJob: any;

  constructor() {
    this.initializeScheduler();
  }

  /**
   * Initialize the scheduler with cron jobs
   */
  private initializeScheduler(): void {
    // Run scheduler every minute to check for notices to activate
    this.schedulerJob = cron.schedule('* * * * *', () => {
      this.processScheduledNotices();
    });

    // Cleanup expired notices every hour
    this.cleanupJob = cron.schedule('0 * * * *', () => {
      this.cleanupExpiredNotices();
    });

    // Timer wheel tick (every second)
    setInterval(() => {
      this.processTimerWheel();
    }, 1000);
  }

  /**
   * Schedule a notice with priority-based insertion
   */
  public scheduleNotice(notice: ScheduledNotice): void {
    // Insert into priority queue (min-heap by priority, then by visibleFrom)
    this.insertIntoPriorityQueue(notice);
    
    // Add to timing wheel based on visibleFrom
    this.addToTimingWheel(notice);
    
    // Store interval for overlap detection
    this.timeIntervals.push({
      start: notice.visibleFrom,
      end: notice.visibleUntil,
      noticeId: notice.noticeId
    });
    
    console.log(`Scheduled notice ${notice.noticeId} with priority ${NoticePriority[notice.priority]}`);
  }

  /**
   * Insert notice into priority queue maintaining heap property
   */
  private insertIntoPriorityQueue(notice: ScheduledNotice): void {
    this.dispatchQueue.push(notice);
    this.heapifyUp(this.dispatchQueue.length - 1);
  }

  /**
   * Extract highest priority notice from queue
   */
  public getNextNotice(): ScheduledNotice | null {
    if (this.dispatchQueue.length === 0) return null;
    
    const notice = this.dispatchQueue[0];
    const lastNotice = this.dispatchQueue.pop()!;
    
    if (this.dispatchQueue.length > 0) {
      this.dispatchQueue[0] = lastNotice;
      this.heapifyDown(0);
    }
    
    return notice;
  }

  /**
   * Preempt current notices with higher priority emergency
   */
  public preemptWithEmergency(emergencyNotice: ScheduledNotice): void {
    if (emergencyNotice.priority !== NoticePriority.EMERGENCY) {
      throw new Error('Only emergency notices can preempt');
    }
    
    // Add to front of queue
    this.dispatchQueue.unshift(emergencyNotice);
    
    // Immediately activate
    this.activateNotice(emergencyNotice);
    
    console.log(`Emergency notice ${emergencyNotice.noticeId} preempted all others`);
  }

  /**
   * Add notice to timing wheel
   */
  private addToTimingWheel(notice: ScheduledNotice): void {
    const secondsUntilVisible = Math.floor((notice.visibleFrom.getTime() - Date.now()) / 1000);
    const wheelSlot = (this.currentTick + secondsUntilVisible) % 3600; // 1-hour wheel
    
    if (!this.timerWheel.has(wheelSlot)) {
      this.timerWheel.set(wheelSlot, []);
    }
    
    this.timerWheel.get(wheelSlot)!.push(notice);
  }

  /**
   * Process timing wheel tick
   */
  private processTimerWheel(): void {
    this.currentTick = (this.currentTick + 1) % 3600;
    
    const notices = this.timerWheel.get(this.currentTick);
    if (notices) {
      notices.forEach(notice => {
        if (notice.visibleFrom <= new Date()) {
          this.activateNotice(notice);
        }
      });
      this.timerWheel.delete(this.currentTick);
    }
  }

  /**
   * Check for notices that should be activated now
   */
  private processScheduledNotices(): void {
    const now = new Date();
    const toActivate: ScheduledNotice[] = [];
    
    // Check priority queue for notices ready to activate
    for (let i = 0; i < this.dispatchQueue.length; i++) {
      const notice = this.dispatchQueue[i];
      if (notice.visibleFrom <= now && notice.visibleUntil > now) {
        toActivate.push(notice);
      }
    }
    
    // Activate eligible notices
    toActivate.forEach(notice => {
      this.activateNotice(notice);
      this.removeFromQueue(notice);
    });
  }

  /**
   * Activate a notice (make it live)
   */
  private activateNotice(notice: ScheduledNotice): void {
    this.activeNotices.set(notice.noticeId, notice);
    
    // Initialize delivery checkpoints for target audience
    notice.targetAudience.forEach(targetId => {
      this.createDeliveryCheckpoint(targetId, notice);
    });
    
    // Add to display buffers for each channel
    notice.channels.forEach(channel => {
      this.addToDisplayBuffer(channel, notice);
    });
    
    console.log(`Activated notice ${notice.noticeId} for ${notice.targetAudience.length} targets`);
  }

  /**
   * Create delivery checkpoint for tracking
   */
  private createDeliveryCheckpoint(targetId: string, notice: ScheduledNotice): void {
    const checkpoint: DeliveryCheckpoint = {
      targetId,
      noticeVersionId: notice.noticeId,
      status: 'pending',
      lastAttemptAt: new Date(),
      attempts: 0,
      nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    };
    
    if (!this.deliveryCheckpoints.has(targetId)) {
      this.deliveryCheckpoints.set(targetId, []);
    }
    
    this.deliveryCheckpoints.get(targetId)!.push(checkpoint);
  }

  /**
   * Add notice to circular buffer for display
   */
  private addToDisplayBuffer(displayId: string, notice: ScheduledNotice): void {
    if (!this.displayBuffers.has(displayId)) {
      this.displayBuffers.set(displayId, []);
    }
    
    const buffer = this.displayBuffers.get(displayId)!;
    
    // Handle emergency preemption
    if (notice.priority === NoticePriority.EMERGENCY) {
      buffer.unshift(notice); // Add to front
    } else {
      buffer.push(notice);
    }
    
    // Maintain buffer size (circular behavior)
    while (buffer.length > this.bufferSize) {
      buffer.shift();
    }
  }

  /**
   * Get notices for display
   */
  public getDisplayNotices(displayId: string): ScheduledNotice[] {
    const buffer = this.displayBuffers.get(displayId) || [];
    const now = new Date();
    
    return buffer.filter(notice => 
      notice.visibleFrom <= now && 
      notice.visibleUntil > now
    );
  }

  /**
   * Update delivery status
   */
  public updateDeliveryStatus(targetId: string, noticeId: string, status: DeliveryCheckpoint['status']): void {
    const checkpoints = this.deliveryCheckpoints.get(targetId);
    if (checkpoints) {
      const checkpoint = checkpoints.find(cp => cp.noticeVersionId === noticeId);
      if (checkpoint) {
        checkpoint.status = status;
        checkpoint.lastAttemptAt = new Date();
        
        if (status === 'failed' && checkpoint.attempts < 3) {
          // Exponential backoff for retries
          const backoffMs = Math.pow(2, checkpoint.attempts) * 60 * 1000;
          checkpoint.nextRetryAt = new Date(Date.now() + backoffMs);
          checkpoint.attempts++;
        }
      }
    }
  }

  /**
   * Get failed deliveries that need retry
   */
  public getRetriesNeeded(): { targetId: string; noticeId: string }[] {
    const retries: { targetId: string; noticeId: string }[] = [];
    const now = new Date();
    
    this.deliveryCheckpoints.forEach((checkpoints, targetId) => {
      checkpoints.forEach(checkpoint => {
        if (checkpoint.status === 'failed' && 
            checkpoint.nextRetryAt && 
            checkpoint.nextRetryAt <= now &&
            checkpoint.attempts < 3) {
          retries.push({ 
            targetId, 
            noticeId: checkpoint.noticeVersionId 
          });
        }
      });
    });
    
    return retries;
  }

  /**
   * Find overlapping notices using interval tree logic
   */
  public findOverlappingNotices(start: Date, end: Date): TimeInterval[] {
    return this.timeIntervals.filter(interval => 
      interval.start < end && interval.end > start
    );
  }

  /**
   * Add blackout period
   */
  public addBlackoutPeriod(start: Date, end: Date): void {
    this.timeIntervals.push({
      start,
      end,
      noticeId: 'blackout-' + Date.now(),
      isBlackout: true
    });
  }

  /**
   * Check if time period conflicts with blackout
   */
  public isBlackoutPeriod(start: Date, end: Date): boolean {
    return this.timeIntervals.some(interval => 
      interval.isBlackout && 
      interval.start < end && 
      interval.end > start
    );
  }

  /**
   * Clean up expired notices
   */
  private cleanupExpiredNotices(): void {
    const now = new Date();
    const expiredNotices: string[] = [];
    
    // Remove expired active notices
    this.activeNotices.forEach((notice, id) => {
      if (notice.visibleUntil <= now) {
        expiredNotices.push(id);
      }
    });
    
    expiredNotices.forEach(id => {
      this.activeNotices.delete(id);
      console.log(`Expired notice ${id}`);
    });
    
    // Clean up old intervals
    this.timeIntervals = this.timeIntervals.filter(interval => 
      interval.end > new Date(now.getTime() - 24 * 60 * 60 * 1000) // Keep 24h history
    );
    
    // Clean up display buffers
    this.displayBuffers.forEach((buffer, displayId) => {
      const activeBuffer = buffer.filter(notice => notice.visibleUntil > now);
      this.displayBuffers.set(displayId, activeBuffer);
    });
  }

  /**
   * Get scheduler statistics
   */
  public getStats() {
    return {
      queueSize: this.dispatchQueue.length,
      activeNotices: this.activeNotices.size,
      totalIntervals: this.timeIntervals.length,
      displayBuffers: this.displayBuffers.size,
      pendingDeliveries: this.getTotalPendingDeliveries(),
      timerWheelSlots: this.timerWheel.size
    };
  }

  private getTotalPendingDeliveries(): number {
    let total = 0;
    this.deliveryCheckpoints.forEach(checkpoints => {
      total += checkpoints.filter(cp => cp.status === 'pending').length;
    });
    return total;
  }

  // Binary heap operations
  private heapifyUp(index: number): void {
    if (index === 0) return;
    
    const parentIndex = Math.floor((index - 1) / 2);
    const current = this.dispatchQueue[index];
    const parent = this.dispatchQueue[parentIndex];
    
    if (this.comparePriority(current, parent) < 0) {
      this.dispatchQueue[index] = parent;
      this.dispatchQueue[parentIndex] = current;
      this.heapifyUp(parentIndex);
    }
  }

  private heapifyDown(index: number): void {
    const leftChild = 2 * index + 1;
    const rightChild = 2 * index + 2;
    let smallest = index;
    
    if (leftChild < this.dispatchQueue.length && 
        this.comparePriority(this.dispatchQueue[leftChild], this.dispatchQueue[smallest]) < 0) {
      smallest = leftChild;
    }
    
    if (rightChild < this.dispatchQueue.length && 
        this.comparePriority(this.dispatchQueue[rightChild], this.dispatchQueue[smallest]) < 0) {
      smallest = rightChild;
    }
    
    if (smallest !== index) {
      const temp = this.dispatchQueue[index];
      this.dispatchQueue[index] = this.dispatchQueue[smallest];
      this.dispatchQueue[smallest] = temp;
      this.heapifyDown(smallest);
    }
  }

  private comparePriority(a: ScheduledNotice, b: ScheduledNotice): number {
    // First compare by priority (lower number = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Then by visibleFrom date (earlier = higher priority)
    return a.visibleFrom.getTime() - b.visibleFrom.getTime();
  }

  private removeFromQueue(notice: ScheduledNotice): void {
    const index = this.dispatchQueue.findIndex(n => n.noticeId === notice.noticeId);
    if (index !== -1) {
      const lastNotice = this.dispatchQueue.pop()!;
      if (index < this.dispatchQueue.length) {
        this.dispatchQueue[index] = lastNotice;
        this.heapifyDown(index);
      }
    }
  }

  /**
   * Shutdown scheduler
   */
  public shutdown(): void {
    if (this.schedulerJob) {
      this.schedulerJob.stop();
    }
    if (this.cleanupJob) {
      this.cleanupJob.stop();
    }
  }
}

export default NoticeScheduler;
export { NoticePriority, ScheduledNotice, DeliveryCheckpoint, TimeInterval };
