import { BloomFilter } from 'bloom-filters';
import RoaringBitmap32 from 'roaring/RoaringBitmap32';

// User attributes for targeting
interface UserAttributes {
  userId: string;
  role: string;
  department: string;
  location: string;
  language: string;
  deviceCapabilities: string[];
  tags: string[];
}

// Audience rule definition
interface AudienceRule {
  id: string;
  expression: string;
  topics: string[];
  departments: string[];
  roles: string[];
  locations: string[];
  tags: string[];
}

class AudienceTargetingService {
  // Hash maps for fast lookups
  private userAttributes: Map<string, UserAttributes> = new Map();
  private topicSubscriptions: Map<string, Set<string>> = new Map();
  private noticeEligibility: Map<string, AudienceRule> = new Map();
  
  // Inverted index for search (term -> posting list)
  private invertedIndex: Map<string, Set<string>> = new Map();
  
  // Roaring bitmaps for efficient set operations
  private departmentBitmaps: Map<string, RoaringBitmap32> = new Map();
  private roleBitmaps: Map<string, RoaringBitmap32> = new Map();
  private locationBitmaps: Map<string, RoaringBitmap32> = new Map();
  
  // Bloom filter for "has user seen this notice?" checks
  private seenNoticesBloom: BloomFilter;
  
  // User ID to numeric mapping for bitmaps
  private userIdToNumber: Map<string, number> = new Map();
  private numberToUserId: Map<number, string> = new Map();
  private nextUserId = 1;

  constructor() {
    // Initialize bloom filter for 10k notices, 1% false positive rate
    this.seenNoticesBloom = new BloomFilter(10000, 4);
  }

  /**
   * Register a user and their attributes
   */
  public registerUser(userAttributes: UserAttributes): void {
    const { userId, role, department, location, tags } = userAttributes;
    
    // Store user attributes
    this.userAttributes.set(userId, userAttributes);
    
    // Assign numeric ID for bitmap operations
    if (!this.userIdToNumber.has(userId)) {
      this.userIdToNumber.set(userId, this.nextUserId);
      this.numberToUserId.set(this.nextUserId, userId);
      this.nextUserId++;
    }
    
    const numericId = this.userIdToNumber.get(userId)!;
    
    // Update department bitmaps
    this.ensureBitmap(this.departmentBitmaps, department);
    this.departmentBitmaps.get(department)!.add(numericId);
    
    // Update role bitmaps
    this.ensureBitmap(this.roleBitmaps, role);
    this.roleBitmaps.get(role)!.add(numericId);
    
    // Update location bitmaps
    this.ensureBitmap(this.locationBitmaps, location);
    this.locationBitmaps.get(location)!.add(numericId);
    
    // Update inverted index for tags
    tags.forEach(tag => {
      this.ensureInvertedIndex(tag);
      this.invertedIndex.get(tag)!.add(userId);
    });
  }

  /**
   * Subscribe user to topics
   */
  public subscribeToTopic(userId: string, topic: string): void {
    if (!this.topicSubscriptions.has(topic)) {
      this.topicSubscriptions.set(topic, new Set());
    }
    this.topicSubscriptions.get(topic)!.add(userId);
  }

  /**
   * Check if user has seen a notice (using Bloom filter for fast check)
   */
  public hasUserSeenNotice(userId: string, noticeId: string): boolean {
    const key = `${userId}:${noticeId}`;
    return this.seenNoticesBloom.has(key);
  }

  /**
   * Mark notice as seen by user
   */
  public markNoticeSeen(userId: string, noticeId: string): void {
    const key = `${userId}:${noticeId}`;
    this.seenNoticesBloom.add(key);
  }

  /**
   * Find eligible users for a notice using bitmap operations
   */
  public findEligibleUsers(rule: AudienceRule): string[] {
    let eligibleBitmap = new RoaringBitmap32();
    
    // Start with all users if no specific criteria
    if (rule.departments.length === 0 && rule.roles.length === 0 && rule.locations.length === 0) {
      // Add all registered users
      this.userIdToNumber.forEach((numericId) => {
        eligibleBitmap.add(numericId);
      });
    } else {
      // Union of all matching departments
      if (rule.departments.length > 0) {
        const deptUnion = new RoaringBitmap32();
        rule.departments.forEach(dept => {
          const bitmap = this.departmentBitmaps.get(dept);
          if (bitmap) {
            deptUnion.or(bitmap);
          }
        });
        eligibleBitmap = deptUnion;
      }
      
      // Intersect with roles if specified
      if (rule.roles.length > 0) {
        const roleUnion = new RoaringBitmap32();
        rule.roles.forEach(role => {
          const bitmap = this.roleBitmaps.get(role);
          if (bitmap) {
            roleUnion.or(bitmap);
          }
        });
        
        if (eligibleBitmap.size === 0) {
          eligibleBitmap = roleUnion;
        } else {
          eligibleBitmap.and(roleUnion);
        }
      }
      
      // Intersect with locations if specified
      if (rule.locations.length > 0) {
        const locationUnion = new RoaringBitmap32();
        rule.locations.forEach(location => {
          const bitmap = this.locationBitmaps.get(location);
          if (bitmap) {
            locationUnion.or(bitmap);
          }
        });
        
        if (eligibleBitmap.size === 0) {
          eligibleBitmap = locationUnion;
        } else {
          eligibleBitmap.and(locationUnion);
        }
      }
    }
    
    // Additional filtering by tags using inverted index
    if (rule.tags.length > 0) {
      const tagEligibleUsers = new Set<string>();
      rule.tags.forEach(tag => {
        const usersWithTag = this.invertedIndex.get(tag);
        if (usersWithTag) {
          usersWithTag.forEach(userId => tagEligibleUsers.add(userId));
        }
      });
      
      // Filter bitmap results by tag eligibility
      const filteredResults: string[] = [];
      eligibleBitmap.forEach(numericId => {
        const userId = this.numberToUserId.get(numericId);
        if (userId && tagEligibleUsers.has(userId)) {
          filteredResults.push(userId);
        }
      });
      return filteredResults;
    }
    
    // Convert bitmap to user IDs
    const results: string[] = [];
    eligibleBitmap.forEach(numericId => {
      const userId = this.numberToUserId.get(numericId);
      if (userId) {
        results.push(userId);
      }
    });
    
    return results;
  }

  /**
   * Search users by keyword using inverted index
   */
  public searchUsersByTag(tags: string[]): string[] {
    const results = new Set<string>();
    
    tags.forEach(tag => {
      const usersWithTag = this.invertedIndex.get(tag);
      if (usersWithTag) {
        usersWithTag.forEach(userId => results.add(userId));
      }
    });
    
    return Array.from(results);
  }

  /**
   * Get topic subscribers
   */
  public getTopicSubscribers(topic: string): string[] {
    const subscribers = this.topicSubscriptions.get(topic);
    return subscribers ? Array.from(subscribers) : [];
  }

  /**
   * Get user attributes
   */
  public getUserAttributes(userId: string): UserAttributes | undefined {
    return this.userAttributes.get(userId);
  }

  /**
   * Store audience rule
   */
  public storeAudienceRule(noticeId: string, rule: AudienceRule): void {
    this.noticeEligibility.set(noticeId, rule);
  }

  /**
   * Get audience rule for notice
   */
  public getAudienceRule(noticeId: string): AudienceRule | undefined {
    return this.noticeEligibility.get(noticeId);
  }

  // Private helper methods
  private ensureBitmap(bitmapMap: Map<string, RoaringBitmap32>, key: string): void {
    if (!bitmapMap.has(key)) {
      bitmapMap.set(key, new RoaringBitmap32());
    }
  }

  private ensureInvertedIndex(term: string): void {
    if (!this.invertedIndex.has(term)) {
      this.invertedIndex.set(term, new Set());
    }
  }

  /**
   * Get statistics about the targeting system
   */
  public getStats() {
    const stats = {
      totalUsers: this.userAttributes.size,
      totalDepartments: this.departmentBitmaps.size,
      totalRoles: this.roleBitmaps.size,
      totalLocations: this.locationBitmaps.size,
      totalTopics: this.topicSubscriptions.size,
      totalIndexTerms: this.invertedIndex.size,
      bloomFilterElements: this.seenNoticesBloom.size
    };
    
    return stats;
  }
}

export default AudienceTargetingService;
export { UserAttributes, AudienceRule };
