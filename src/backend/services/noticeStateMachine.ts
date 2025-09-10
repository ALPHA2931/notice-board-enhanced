// Notice states based on TOC finite state machine design
enum NoticeState {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  MODERATION_PENDING = 'moderation_pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
  REINSTATED = 'reinstated'
}

// Events that can trigger state transitions
enum NoticeEvent {
  SUBMIT = 'submit',
  APPROVE = 'approve',
  REJECT = 'reject',
  SCHEDULE = 'schedule',
  ACTIVATE = 'activate',
  EXPIRE = 'expire',
  ARCHIVE = 'archive',
  REINSTATE = 'reinstate',
  UPDATE = 'update'
}

// Transition input
interface TransitionInput {
  event: NoticeEvent;
  timestamp: Date;
  userId: string;
  userRole: string;
  metadata?: any;
}

// State transition record for audit log
interface StateTransition {
  id: string;
  noticeId: string;
  fromState: NoticeState;
  toState: NoticeState;
  event: NoticeEvent;
  timestamp: Date;
  userId: string;
  userRole: string;
  metadata?: any;
  isValid: boolean;
  reason?: string;
}

// User roles for permission checking
enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  PUBLISHER = 'publisher',
  USER = 'user'
}

// Notice context for guard evaluations
interface NoticeContext {
  id: string;
  currentState: NoticeState;
  createdAt: Date;
  visibleFrom?: Date;
  visibleUntil?: Date;
  priority: number;
  authorId: string;
  lastModifiedAt: Date;
}

class NoticeStateMachine {
  // Transition function δ(state, input) → state'
  private transitionTable: Map<string, Map<NoticeEvent, NoticeState>> = new Map();
  
  // Append-only log of all state transitions
  private stateLog: StateTransition[] = [];
  
  // Current state of each notice
  private noticeStates: Map<string, NoticeState> = new Map();
  
  // Notice contexts for guard evaluations
  private noticeContexts: Map<string, NoticeContext> = new Map();

  constructor() {
    this.initializeTransitionTable();
  }

  /**
   * Initialize the deterministic transition table
   */
  private initializeTransitionTable(): void {
    // Draft state transitions
    this.addTransition(NoticeState.DRAFT, NoticeEvent.SUBMIT, NoticeState.SUBMITTED);
    this.addTransition(NoticeState.DRAFT, NoticeEvent.UPDATE, NoticeState.DRAFT);
    this.addTransition(NoticeState.DRAFT, NoticeEvent.ARCHIVE, NoticeState.ARCHIVED);

    // Submitted state transitions  
    this.addTransition(NoticeState.SUBMITTED, NoticeEvent.APPROVE, NoticeState.MODERATION_PENDING);
    this.addTransition(NoticeState.SUBMITTED, NoticeEvent.REJECT, NoticeState.REJECTED);
    this.addTransition(NoticeState.SUBMITTED, NoticeEvent.UPDATE, NoticeState.DRAFT);

    // Moderation pending transitions
    this.addTransition(NoticeState.MODERATION_PENDING, NoticeEvent.APPROVE, NoticeState.APPROVED);
    this.addTransition(NoticeState.MODERATION_PENDING, NoticeEvent.REJECT, NoticeState.REJECTED);

    // Approved state transitions
    this.addTransition(NoticeState.APPROVED, NoticeEvent.SCHEDULE, NoticeState.SCHEDULED);
    this.addTransition(NoticeState.APPROVED, NoticeEvent.ACTIVATE, NoticeState.ACTIVE);
    this.addTransition(NoticeState.APPROVED, NoticeEvent.REJECT, NoticeState.REJECTED);

    // Scheduled state transitions
    this.addTransition(NoticeState.SCHEDULED, NoticeEvent.ACTIVATE, NoticeState.ACTIVE);
    this.addTransition(NoticeState.SCHEDULED, NoticeEvent.REJECT, NoticeState.REJECTED);

    // Active state transitions
    this.addTransition(NoticeState.ACTIVE, NoticeEvent.EXPIRE, NoticeState.EXPIRED);
    this.addTransition(NoticeState.ACTIVE, NoticeEvent.ARCHIVE, NoticeState.ARCHIVED);

    // Expired state transitions
    this.addTransition(NoticeState.EXPIRED, NoticeEvent.ARCHIVE, NoticeState.ARCHIVED);
    this.addTransition(NoticeState.EXPIRED, NoticeEvent.REINSTATE, NoticeState.REINSTATED);

    // Archived state transitions (normally terminal)
    this.addTransition(NoticeState.ARCHIVED, NoticeEvent.REINSTATE, NoticeState.REINSTATED);

    // Reinstated state transitions
    this.addTransition(NoticeState.REINSTATED, NoticeEvent.APPROVE, NoticeState.APPROVED);
    this.addTransition(NoticeState.REINSTATED, NoticeEvent.ARCHIVE, NoticeState.ARCHIVED);

    // Rejected is mostly terminal except for reinstatement
    this.addTransition(NoticeState.REJECTED, NoticeEvent.REINSTATE, NoticeState.REINSTATED);
  }

  /**
   * Add a transition to the transition table
   */
  private addTransition(fromState: NoticeState, event: NoticeEvent, toState: NoticeState): void {
    const key = fromState;
    if (!this.transitionTable.has(key)) {
      this.transitionTable.set(key, new Map());
    }
    this.transitionTable.get(key)!.set(event, toState);
  }

  /**
   * Initialize a notice in DRAFT state
   */
  public initializeNotice(noticeId: string, context: NoticeContext): void {
    this.noticeStates.set(noticeId, NoticeState.DRAFT);
    this.noticeContexts.set(noticeId, context);
    
    // Log initial state
    this.logTransition({
      id: this.generateTransitionId(),
      noticeId,
      fromState: NoticeState.DRAFT,
      toState: NoticeState.DRAFT,
      event: NoticeEvent.UPDATE,
      timestamp: new Date(),
      userId: 'system',
      userRole: 'system',
      isValid: true,
      reason: 'Initial state'
    });
  }

  /**
   * Process a state transition
   */
  public transition(noticeId: string, input: TransitionInput): StateTransition {
    const currentState = this.noticeStates.get(noticeId);
    if (!currentState) {
      throw new Error(`Notice ${noticeId} not found`);
    }

    const context = this.noticeContexts.get(noticeId);
    if (!context) {
      throw new Error(`Notice context ${noticeId} not found`);
    }

    // Check if transition is valid according to FSM
    const newState = this.getNextState(currentState, input.event);
    const transitionId = this.generateTransitionId();

    let transition: StateTransition;

    if (!newState) {
      // Invalid transition according to FSM
      transition = {
        id: transitionId,
        noticeId,
        fromState: currentState,
        toState: currentState,
        event: input.event,
        timestamp: input.timestamp,
        userId: input.userId,
        userRole: input.userRole,
        metadata: input.metadata,
        isValid: false,
        reason: `Invalid transition from ${currentState} with event ${input.event}`
      };
    } else {
      // Check guards (permissions and conditions)
      const guardResult = this.evaluateGuards(currentState, newState, input, context);
      
      if (guardResult.allowed) {
        // Valid transition with satisfied guards
        this.noticeStates.set(noticeId, newState);
        
        transition = {
          id: transitionId,
          noticeId,
          fromState: currentState,
          toState: newState,
          event: input.event,
          timestamp: input.timestamp,
          userId: input.userId,
          userRole: input.userRole,
          metadata: input.metadata,
          isValid: true
        };

        // Update notice context if needed
        this.updateContextAfterTransition(context, newState, input);
      } else {
        // Transition blocked by guards
        transition = {
          id: transitionId,
          noticeId,
          fromState: currentState,
          toState: currentState,
          event: input.event,
          timestamp: input.timestamp,
          userId: input.userId,
          userRole: input.userRole,
          metadata: input.metadata,
          isValid: false,
          reason: guardResult.reason
        };
      }
    }

    // Log transition (both valid and invalid for audit)
    this.logTransition(transition);
    
    return transition;
  }

  /**
   * Get next state from transition table (deterministic function)
   */
  private getNextState(currentState: NoticeState, event: NoticeEvent): NoticeState | null {
    const stateTransitions = this.transitionTable.get(currentState);
    if (!stateTransitions) return null;
    
    return stateTransitions.get(event) || null;
  }

  /**
   * Evaluate guard conditions for transitions
   */
  private evaluateGuards(
    fromState: NoticeState, 
    toState: NoticeState, 
    input: TransitionInput, 
    context: NoticeContext
  ): { allowed: boolean; reason?: string } {
    const { event, userRole, timestamp } = input;

    // Role-based permissions
    switch (event) {
      case NoticeEvent.APPROVE:
        if (userRole !== UserRole.MODERATOR && userRole !== UserRole.ADMIN) {
          return { allowed: false, reason: 'Only moderators can approve notices' };
        }
        break;

      case NoticeEvent.REJECT:
        if (userRole !== UserRole.MODERATOR && userRole !== UserRole.ADMIN) {
          return { allowed: false, reason: 'Only moderators can reject notices' };
        }
        break;

      case NoticeEvent.REINSTATE:
        if (userRole !== UserRole.ADMIN) {
          return { allowed: false, reason: 'Only admins can reinstate notices' };
        }
        break;

      case NoticeEvent.SUBMIT:
        if (userRole === UserRole.USER) {
          return { allowed: false, reason: 'Users cannot submit notices directly' };
        }
        break;
    }

    // Time-based predicates
    if (event === NoticeEvent.ACTIVATE) {
      if (context.visibleFrom && context.visibleFrom > timestamp) {
        return { allowed: false, reason: 'Cannot activate before visible_from time' };
      }
    }

    if (event === NoticeEvent.EXPIRE) {
      if (context.visibleUntil && context.visibleUntil > timestamp) {
        return { allowed: false, reason: 'Cannot expire before visible_until time' };
      }
    }

    // State-specific guards
    if (fromState === NoticeState.ARCHIVED && toState === NoticeState.REINSTATED) {
      // Additional checks for reinstatement from archived state
      const daysSinceArchived = (timestamp.getTime() - context.lastModifiedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceArchived > 30 && userRole !== UserRole.ADMIN) {
        return { allowed: false, reason: 'Cannot reinstate notices archived for more than 30 days without admin privileges' };
      }
    }

    return { allowed: true };
  }

  /**
   * Update notice context after successful transition
   */
  private updateContextAfterTransition(context: NoticeContext, newState: NoticeState, input: TransitionInput): void {
    context.currentState = newState;
    context.lastModifiedAt = input.timestamp;

    // State-specific updates
    if (newState === NoticeState.SCHEDULED && input.metadata?.scheduledTime) {
      context.visibleFrom = new Date(input.metadata.scheduledTime);
    }
  }

  /**
   * Get current state of a notice
   */
  public getCurrentState(noticeId: string): NoticeState | null {
    return this.noticeStates.get(noticeId) || null;
  }

  /**
   * Check if a transition is valid (without executing it)
   */
  public canTransition(noticeId: string, event: NoticeEvent, userRole: string): boolean {
    const currentState = this.noticeStates.get(noticeId);
    if (!currentState) return false;

    const newState = this.getNextState(currentState, event);
    if (!newState) return false;

    const context = this.noticeContexts.get(noticeId);
    if (!context) return false;

    const guardResult = this.evaluateGuards(
      currentState, 
      newState, 
      { event, timestamp: new Date(), userId: 'check', userRole } as TransitionInput, 
      context
    );

    return guardResult.allowed;
  }

  /**
   * Get all valid transitions from current state
   */
  public getValidTransitions(noticeId: string, userRole: string): NoticeEvent[] {
    const currentState = this.noticeStates.get(noticeId);
    if (!currentState) return [];

    const stateTransitions = this.transitionTable.get(currentState);
    if (!stateTransitions) return [];

    const validEvents: NoticeEvent[] = [];
    
    stateTransitions.forEach((toState, event) => {
      if (this.canTransition(noticeId, event, userRole)) {
        validEvents.push(event);
      }
    });

    return validEvents;
  }

  /**
   * Get transition history for a notice
   */
  public getTransitionHistory(noticeId: string): StateTransition[] {
    return this.stateLog.filter(transition => transition.noticeId === noticeId);
  }

  /**
   * Get all notices in a specific state
   */
  public getNoticesByState(state: NoticeState): string[] {
    const notices: string[] = [];
    this.noticeStates.forEach((noticeState, noticeId) => {
      if (noticeState === state) {
        notices.push(noticeId);
      }
    });
    return notices;
  }

  /**
   * Get state statistics
   */
  public getStateStatistics(): Map<NoticeState, number> {
    const stats = new Map<NoticeState, number>();
    
    // Initialize all states with 0
    Object.values(NoticeState).forEach(state => {
      stats.set(state as NoticeState, 0);
    });
    
    // Count notices in each state
    this.noticeStates.forEach(state => {
      const current = stats.get(state) || 0;
      stats.set(state, current + 1);
    });
    
    return stats;
  }

  /**
   * Validate FSM completeness and correctness
   */
  public validateFSM(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check that all states have at least one outgoing transition
    Object.values(NoticeState).forEach(state => {
      const stateKey = state as NoticeState;
      const transitions = this.transitionTable.get(stateKey);
      
      if (!transitions || transitions.size === 0) {
        if (stateKey !== NoticeState.ARCHIVED && stateKey !== NoticeState.REJECTED) {
          issues.push(`State ${stateKey} has no outgoing transitions`);
        }
      }
    });

    // Check for unreachable states (except DRAFT which is initial)
    const reachableStates = new Set<NoticeState>([NoticeState.DRAFT]);
    let changed = true;
    
    while (changed) {
      changed = false;
      this.transitionTable.forEach((transitions, fromState) => {
        if (reachableStates.has(fromState)) {
          transitions.forEach(toState => {
            if (!reachableStates.has(toState)) {
              reachableStates.add(toState);
              changed = true;
            }
          });
        }
      });
    }

    Object.values(NoticeState).forEach(state => {
      if (!reachableStates.has(state as NoticeState)) {
        issues.push(`State ${state} is unreachable`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Export FSM as DOT graph for visualization
   */
  public exportToDOT(): string {
    let dot = 'digraph NoticeStateMachine {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=circle];\n';
    
    // Mark initial and final states
    dot += `  "${NoticeState.DRAFT}" [shape=doublecircle, style=bold];\n`;
    dot += `  "${NoticeState.ARCHIVED}" [shape=doublecircle];\n`;
    dot += `  "${NoticeState.REJECTED}" [shape=doublecircle];\n`;
    
    // Add transitions
    this.transitionTable.forEach((transitions, fromState) => {
      transitions.forEach((toState, event) => {
        dot += `  "${fromState}" -> "${toState}" [label="${event}"];\n`;
      });
    });
    
    dot += '}\n';
    return dot;
  }

  // Private helper methods
  private logTransition(transition: StateTransition): void {
    this.stateLog.push(transition);
    console.log(`State transition: ${transition.noticeId} ${transition.fromState} -> ${transition.toState} (${transition.event}) [${transition.isValid ? 'VALID' : 'INVALID'}]`);
  }

  private generateTransitionId(): string {
    return `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get total number of transitions processed
   */
  public getTransitionCount(): number {
    return this.stateLog.length;
  }

  /**
   * Get system statistics
   */
  public getSystemStats() {
    const stateStats = this.getStateStatistics();
    const totalNotices = this.noticeStates.size;
    const totalTransitions = this.stateLog.length;
    const validTransitions = this.stateLog.filter(t => t.isValid).length;
    const invalidTransitions = totalTransitions - validTransitions;

    return {
      totalNotices,
      totalTransitions,
      validTransitions,
      invalidTransitions,
      stateDistribution: Object.fromEntries(stateStats),
      fsmValidation: this.validateFSM()
    };
  }
}

export default NoticeStateMachine;
export { 
  NoticeState, 
  NoticeEvent, 
  UserRole, 
  TransitionInput, 
  StateTransition, 
  NoticeContext 
};
