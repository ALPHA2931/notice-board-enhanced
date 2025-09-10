# Digital Notice Board — Systems Design and CS Foundations

This document specifies a robust, scalable digital notice board that improves on traditional notice boards using core CS concepts across Data Structures, Operating Systems, and Theory of Computation.


## 1) Communication gaps in traditional notice boards this system must solve

- Timeliness and freshness
  - Notices go stale; no automated expiry or scheduling.
  - No prioritization (urgent vs informational) or time-of-day targeting.
- Audience targeting
  - One-size-fits-all; no segmentation by role, location, cohort, device, language, accessibility needs.
- Delivery reliability and reach
  - Physical visibility constraints; no guarantees that intended recipients actually see the notice.
  - No retries, acknowledgements, or multi-channel delivery (screen, mobile, email, API).
- Deduplication and versioning
  - Duplicate notices proliferate; no canonical source, no hash-based equivalence, no supersedence chain.
- Moderation and provenance
  - Hard to authenticate the publisher; no audit trail of edits, approvals, and takedowns.
- Feedback and measurement
  - No telemetry: who viewed, when, and where; no A/B testing or engagement metrics.
- Concurrency and governance
  - Conflicts when multiple publishers attempt to post or update simultaneously; no workflow or admission control.
- Accessibility and discoverability
  - Poor search; no tagging, indexing, or language fallback.
- Compliance and retention
  - No automated archival, retention windows, or legal holds.

This system directly addresses each gap through structured data, programmable delivery, and verifiable workflows.


## 2) Data Structures for targeting, scheduling, delivery, and deduplication

- Audience targeting
  - Hash maps / dictionaries
    - userId → attributes (role, dept, location, language, device capabilities)
    - topic → subscriber set
    - noticeId → eligibility predicate
  - Inverted index (hash map of term → posting list)
    - Tags/keywords to notice sets for fast search and facet filtering.
  - Bitsets / Roaring bitmaps
    - Efficient audience membership and fast set ops (AND/OR/NOT) for cohort selection at scale.
  - Graphs
    - Organization graph (departments, teams) and location graph (campus → building → floor) for hierarchical targeting.
  - Bloom filters
    - Fast pre-check for “has user seen this notice?” in high-throughput feeds to reduce store lookups.

- Scheduling and prioritization
  - Priority queues (binary heap / pairing heap)
    - Dispatch queue ordered by (visible_from, priority, deadline), supporting preemption for urgent notices.
  - Timing wheels or calendar queues
    - Efficient timers for large numbers of scheduled activations/expirations.
  - Interval trees
    - Manage overlapping time windows, blackout periods, rotating playlists on displays.
  - Circular/ring buffers
    - Lock-free producer/consumer queues for per-display frame pipelines.

- Delivery and routing
  - Hash maps and consistent hashing
    - Partition notices across brokers; route users to shards; stable assignment minimizes rebalancing.
  - Tries / prefix trees
    - Topic hierarchy (e.g., campus/eng/building-5) for wildcard subscriptions and efficient prefix routing.
  - Merkle trees
    - Integrity checks and incremental sync of notice sets to edge devices.

- Deduplication and versioning
  - Content-addressed IDs (hashes)
    - SHA-256(content canonical form) to deduplicate identical payloads across uploads.
  - Cuckoo/Bloom filters
    - Fast “already delivered/seen” checks in edge caches.
  - DAG (version graph)
    - noticeId → versions as nodes with edges for supersedes/reverts; supports CRDT-like merge policies for concurrent edits.


## 3) Applying Operating Systems concepts (POS) to publishing, dispatching, reliable delivery

- Process scheduling
  - Publisher workers (CPU-bound validation) and dispatcher workers (I/O-bound delivery) placed in separate pools.
  - Multi-queue scheduling: per-tenant queues with weighted fair queuing to prevent noisy neighbors.
  - Priorities and deadlines: urgent/emergency notices preempt routine ones; EDF for time-critical postings.

- Concurrency control
  - Optimistic concurrency with version vectors on notice edits; CAS on publish state transitions.
  - Locks only around small critical sections (index updates); use lock-free queues for high-throughput pipelines.

- Bounded buffers (producer-consumer)
  - Input buffer: validated notices awaiting moderation.
  - Dispatch buffer: scheduled and eligible deliveries awaiting fan-out.
  - Backpressure: when buffers fill, apply admission control (reject/slowdown) and/or shed low-priority load.

- Inter-process communication (IPC)
  - Message bus (e.g., NATS/Kafka/RabbitMQ) between services: Publisher → Scheduler → Dispatcher → Edge.
  - Shared memory/circular buffers for intra-host components (renderer pipeline per display).
  - Idempotent endpoints with message keys to support exactly-once semantics over at-least-once transport.

- Persistence
  - Write-ahead log (WAL) to persist publish events before acknowledging to clients.
  - Outbox pattern to atomically record side effects (emails, push notifications) for reliable handoff to dispatchers.
  - Index stores: search (inverted index), audience bitmaps, and delivery checkpoints per user/device.

- Admission control
  - Token buckets/leaky buckets per tenant and per endpoint.
  - Global circuit breakers to protect downstreams; degrade gracefully to local-edge playlists.
  - Quotas by notice size, fan-out cardinality, and scheduling density per time window.

- Reliability patterns
  - Retries with exponential backoff and jitter; per-target retry policy with max attempts and dead-letter queues.
  - Heartbeats and leases for display agents; if lease expires, reroute delivery or buffer locally.


## 4) Theory of Computation (TOC) models for lifecycle, filtering, and correctness

- Finite State Machine (FSM) for notice lifecycle
  - States: Draft → Submitted → ModerationPending → Approved | Rejected → Scheduled → Active → Expired → Archived → (possibly) Reinstated
  - Transitions guarded by role permissions and time predicates; all transitions recorded in an append-only log.
  - Determinism: for a given input (event, timestamp, role), transition function δ(state, input) → state′ is total.

- Regular languages for audience rules
  - Audience expressions can be constrained to a regular language over attribute predicates with operators (|, &, *) enabling compilation to DFAs for fast membership tests.
  - Path-like topic filters (e.g., campus/(eng|sci)/building-[0-9]+/floor-.*) expressed as regexes compiled once per subscription.

- Decidability and safety
  - Keep targeting predicates within decidable fragments (no unrestricted recursion or unbounded quantification). Use bounded set and temporal operators.
  - Termination guarantees: scheduling evaluation is a fixed-point over finite sets with monotone operators, ensuring convergence.

- Complexity guarantees
  - Targeting: bitmap set ops O(n/word-size) per cohort; inverted index query O(k + matches).
  - Scheduling: heap ops O(log m) for m scheduled items; timing wheel ops amortized O(1).
  - Deduplication: Bloom lookup O(k) hashes; false-positive rate p tuned via m = -(n ln p)/(ln 2)^2.
  - Dispatch: consistent-hash routing O(1) average; trie prefix routing O(L) where L is path length.

- Correctness properties
  - Safety: no notice is delivered before visible_from, after visible_until, or to an ineligible audience.
  - Liveness: any approved, scheduled notice eventually reaches all online eligible displays given bounded failures.
  - Idempotence: replays do not duplicate delivery; delivery record keyed by (noticeVersionId, targetId).
  - Monotonicity: once Archived, content cannot re-enter Active without an explicit Reinstated transition recorded.


## 5) High-level architecture

- Services
  - API Gateway: authn/z, request validation, quotas.
  - Publisher: create/update drafts; submit for moderation.
  - Moderator: approve/reject; policy engine.
  - Scheduler: compute eligibility windows and enqueue deliveries.
  - Dispatcher: fan-out to channels (display agents, mobile push, email, webhooks).
  - Search/Index: inverted index and audience bitmap store.
  - Edge Agent: runs on displays; caches playlists and renders; reports heartbeats and receipts.

- Storage
  - Relational DB for metadata and workflow; document/blob store for content; search engine for text; key-value store for counters and bitmaps.

- Data flows
  - Write path uses WAL + outbox; read path uses caches + Merkle-based sync for edge.


## 6) Minimal data model (logical)

- Notice(id, version, title, body, mediaRefs, tags[], priority, visible_from, visible_until, state)
- AudienceRule(id, expression, compiledDFA, topicPaths[])
- DeliveryCheckpoint(targetId, noticeVersionId, status, lastAttemptAt, attempts)
- User(id, attrs{role,dept,location,lang,deviceCaps}, subscriptions[])
- Display(id, locationPath, capabilities, lastHeartbeat, leaseUntil)


## 7) Example flows

- Publish
  1) Client POSTs draft → validation → state Draft.
  2) Submit → state Submitted → moderation queue.
  3) Approve → state Approved; audience DFA compiled; schedule computed; enqueued.
  4) At visible_from → Scheduler moves to Active; Dispatcher fans out.

- Delivery
  1) Dispatcher pulls from priority queue by urgency/deadline.
  2) For each target shard, compute (topic match AND audience DFA AND availability) using bitmaps/DFAs.
  3) Send with idempotency key; record checkpoint; retry on failure.


## 8) Operational safeguards

- Multi-tenant isolation via per-tenant keys, quotas, and queues.
- Audit log for all state transitions and policy decisions.
- Blue/green or canary rollouts for edge agents; backwards-compatible playlist schemas.
- Observability: SLOs, tracing, structured logs with noticeId/tenantId correlation.


## 9) Implementation sketch (illustrative snippets)

```python path=null start=null
# Audience membership using roaring bitmaps (conceptual)
eligible = dept_bitmap["eng"] & location_bitmap["campus/5"]
eligible -= opted_out_bitmap
for user_id in eligible.iter_ids():
    if notice_dfa.accepts(user_attrs[user_id]):
        enqueue_delivery(user_id, notice_version_id, priority)
```

```go path=null start=null
// Scheduling with a min-heap by (visible_from, priority)
type Item struct { NoticeID string; VisibleFrom time.Time; Priority int }
// Push: O(log m), Pop: O(log m)
```

```text path=null start=null
FSM (simplified):
Draft -(submit)-> Submitted -(approve)-> Approved -(schedule)-> Scheduled
Scheduled -(time>=visible_from)-> Active -(time>visible_until)-> Expired -> Archived
Rejected is terminal unless Reinstated by policy.
```

```regex path=null start=null
# Topic filters (regular language example)
campus\/(eng|sci)\/building-[0-9]+\/floor-.*
```


## 10) How this maps to user-visible features

- Targeted announcements per role/location with assured delivery and read receipts.
- Urgent alerts preempt lower priority content across all screens instantly.
- Avoid duplicates across channels; update-in-place when content is edited.
- Searchable archive with audit trail and retention policies.
- Offline-capable displays with eventual synchronization when reconnected.


## 11) Next steps (optional)

- Define concrete schemas per chosen stack (e.g., Postgres + Redis + Kafka).
- Implement the FSM and audience DFA compiler as libraries.
- Build dispatcher workers with idempotent delivery and outbox consumption.
- Create an Edge Agent skeleton with playlist cache, leases, and Merkle sync.

