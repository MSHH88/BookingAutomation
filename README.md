Cleared /private/var/folders/lv/nzz8ww495y957l52cl56gs3r0000gn/T/jest_dx
 PASS  src/modules/quotes/quotes.service.test.ts (137.598 s)
 PASS  src/modules/payments/payments.service.test.ts (144.532 s)
 PASS  src/modules/notifications/notifications.service.test.ts (144.521 s)
 PASS  src/modules/services/services.service.test.ts (144.534 s)
 PASS  src/modules/waitlist/waitlist.service.test.ts (145.596 s)
 PASS  src/modules/analytics/analytics.service.test.ts (149.138 s)
 PASS  src/modules/bookings/bookings.service.test.ts (156.012 s)
 PASS  src/modules/calendar/calendar.service.test.ts (16.547 s)
 PASS  src/modules/invoices/invoices.service.test.ts (19.442 s)
 PASS  src/modules/leads/leads.service.test.ts (26.501 s)
 PASS  src/modules/availability/availability.service.test.ts (21.26 s)
 PASS  src/modules/admin/admin.service.test.ts (25.512 s)
 PASS  src/modules/reminders/reminders.queue.test.ts (7.19 s)
 PASS  src/modules/customers/customers.service.test.ts (22.348 s)
 PASS  src/modules/whatsapp/whatsapp.service.test.ts (11.556 s)
  ● Console

    console.log
      prisma:error 
      Invalid `prisma.featureFlag.findFirst()` invocation in
      /Users/neilapacesaite/Desktop/Automation/backend/src/middleware/requireFeature.ts:74:38
      
        71 
        72 // Fall back to global row if no tenant-specific override was found
        73 if (row === null) {
      → 74   row = await prisma.featureFlag.findFirst(
      Can't reach database server at `test:5432`
      
      Please make sure your database server is running at `test:5432`.

      at Object.mc (node_modules/@prisma/client/runtime/library.js:21:432)

 PASS  src/modules/auth/auth.service.test.ts (9.216 s)
 PASS  src/modules/capture/capture.service.test.ts (12.44 s)
 PASS  src/modules/calendar/outlook-calendar.service.test.ts
 PASS  src/modules/whatsapp-templates/whatsapp-templates.service.test.ts (5.782 s)
 PASS  src/modules/email-templates/email-templates.service.test.ts (9.012 s)
 PASS  src/modules/sms-templates/sms-templates.service.test.ts (11.025 s)
 PASS  src/modules/reviews/reviews.queue.test.ts (5.948 s)
 PASS  src/modules/calendar/apple-calendar.service.test.ts (6.018 s)
 PASS  src/modules/public/public.service.test.ts (11.027 s)
 PASS  src/modules/customer-stats/customer-stats.service.test.ts (11.063 s)
 PASS  src/modules/webhooks/webhooks.service.test.ts (12.749 s)
 PASS  src/modules/uploads/uploads.service.test.ts (7.908 s)
 PASS  src/modules/tables/tables.service.test.ts (18.03 s)
 PASS  src/modules/forms/forms.service.test.ts (30.248 s)
 PASS  src/lib/pricing-engine.test.ts (60.249 s)
 PASS  src/modules/products/products.service.test.ts (66.862 s)
 PASS  src/modules/campaigns/campaigns.service.test.ts (14.78 s)
 PASS  src/modules/sessions/sessions.test.ts (362.114 s)
 PASS  src/modules/waitlist/waitlist.test.ts (273.157 s)
 PASS  src/modules/auth/auth.test.ts (348.736 s)
 PASS  src/modules/leads/leads.test.ts (329.399 s)
 FAIL  src/modules/public/public.test.ts (253.242 s)
  ● /api/public › POST /api/public/businesses/:slug/bookings › 201 — creates booking

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 500

      226 |         });
      227 |
    > 228 |       expect(res.status).toBe(201);
          |                          ^
      229 |       expect(res.body.data.publicToken).toBe('d4e5f6a7-b8c9-0123-def0-123456789abc');
      230 |     });
      231 |

      at Object.<anonymous> (src/modules/public/public.test.ts:228:26)

 PASS  src/modules/calendar/calendar.test.ts (268.679 s)
 PASS  src/modules/artists/artists.test.ts (357.103 s)
 PASS  src/modules/recurring-bookings/recurring-bookings.service.test.ts (59.946 s)
 PASS  src/modules/referrals/referrals.service.test.ts (103.111 s)
 PASS  src/modules/bookings/bookings.test.ts (127.646 s)
 PASS  src/modules/payments/payments.test.ts (142.375 s)
 PASS  src/modules/whatsapp-templates/whatsapp-templates.test.ts (149.848 s)
 PASS  src/modules/pos/pos.service.test.ts (50.608 s)
 PASS  src/modules/email-templates/email-templates.test.ts (153.339 s)
 FAIL  src/modules/pricing/pricing.test.ts (143.939 s)
  ● GET /api/pricing-rules › returns empty list when no rules

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      142 |       .set('Authorization', `Bearer ${adminToken}`);
      143 |
    > 144 |     expect(res.status).toBe(200);
          |                        ^
      145 |     expect(res.body.data).toEqual([]);
      146 |   });
      147 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:144:24)

  ● GET /api/pricing-rules › returns list of rules

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      153 |       .set('Authorization', `Bearer ${adminToken}`);
      154 |
    > 155 |     expect(res.status).toBe(200);
          |                        ^
      156 |     expect(res.body.data).toHaveLength(1);
      157 |     expect(res.body.data[0].id).toBe('rule_1');
      158 |   });

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:155:24)

 PASS  src/config/businessType.test.ts (13.191 s)
 PASS  src/modules/sms-templates/sms-templates.test.ts (124.473 s)
 PASS  src/modules/memberships/memberships.service.test.ts (21.894 s)
 PASS  src/modules/packages/packages.service.test.ts (27.82 s)
 PASS  src/modules/settings/settings.service.test.ts (13.948 s)
 PASS  src/modules/alerts/alerts.service.test.ts (76.092 s)
 PASS  src/modules/forms/forms.test.ts (64.046 s)
 PASS  src/modules/gift-cards/gift-cards.service.test.ts (37.084 s)
 PASS  src/modules/tenants/tenants.test.ts (55.777 s)
 PASS  src/modules/analytics/analytics.test.ts (73.153 s)
 FAIL  src/modules/locations/locations.test.ts (78.128 s)
  ● GET /api/locations › returns empty list when no locations

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      121 |       .set('Authorization', `Bearer ${adminToken}`);
      122 |
    > 123 |     expect(res.status).toBe(200);
          |                        ^
      124 |     expect(res.body.data).toEqual([]);
      125 |   });
      126 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:123:24)

  ● GET /api/locations › returns list of locations

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      132 |       .set('Authorization', `Bearer ${adminToken}`);
      133 |
    > 134 |     expect(res.status).toBe(200);
          |                        ^
      135 |     expect(res.body.data).toHaveLength(1);
      136 |     expect(res.body.data[0].id).toBe('loc_1');
      137 |   });

      at Object.<anonymous> (src/modules/locations/locations.test.ts:134:24)

  ● GET /api/locations › filters by isActive=true

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      144 |       .set('Authorization', `Bearer ${adminToken}`);
      145 |
    > 146 |     expect(res.status).toBe(200);
          |                        ^
      147 |     expect(mockLocationFindMany).toHaveBeenCalledWith(
      148 |       expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
      149 |     );

      at Object.<anonymous> (src/modules/locations/locations.test.ts:146:24)

 PASS  src/modules/quotes/quotes.test.ts (161.763 s)
 PASS  src/modules/availability/availability.test.ts (168.019 s)
 PASS  src/modules/tenants/tenants.service.test.ts (142.392 s)
 PASS  src/modules/ai/ai.service.test.ts (133.589 s)
 PASS  src/modules/styles/styles.service.test.ts (126.303 s)
 PASS  src/modules/referrals/referrals.test.ts (133.673 s)
 PASS  src/modules/settings/settings.test.ts (154.752 s)
 PASS  src/modules/roles/roles.service.test.ts (45.601 s)
 PASS  src/modules/features/features.test.ts (85.73 s)
 PASS  src/modules/recurring-bookings/recurring-bookings.test.ts (83.754 s)
 PASS  src/modules/products/products.test.ts (75.132 s)
 PASS  src/modules/services/services.test.ts (166.823 s)
 PASS  src/modules/booking-photos/booking-photos.service.test.ts (50.496 s)
 PASS  src/modules/health-flags/health-flags.service.test.ts (120.626 s)
 PASS  src/modules/roles/roles.test.ts (59.536 s)
 PASS  src/modules/rota/rota.service.test.ts (71.168 s)
 PASS  src/modules/campaigns/campaigns.test.ts (66.901 s)
 PASS  src/modules/rota/rota.test.ts (65.763 s)
 PASS  src/modules/booking-photos/booking-photos.test.ts (65.843 s)
 PASS  src/modules/invoices/invoices.test.ts (76.281 s)
  ● Console

    console.error
      Error: Unhandled error. (Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
          at EventEmitter.emit (node:events:508:28)
          at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
            at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
            at Object.onceWrapper (node:events:622:28)
            at Socket.emit (node:events:508:28)
            at Socket._onTimeout (node:net:604:8)
            at listOnTimeout (node:internal/timers:605:17)
            at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

    console.error
      Error: Unhandled error. (Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
          at EventEmitter.emit (node:events:508:28)
          at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
            at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
            at Object.onceWrapper (node:events:622:28)
            at Socket.emit (node:events:508:28)
            at Socket._onTimeout (node:net:604:8)
            at listOnTimeout (node:internal/timers:605:17)
            at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

    console.error
      Error: Unhandled error. (Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
          at EventEmitter.emit (node:events:508:28)
          at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
            at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
            at Object.onceWrapper (node:events:622:28)
            at Socket.emit (node:events:508:28)
            at Socket._onTimeout (node:net:604:8)
            at listOnTimeout (node:internal/timers:605:17)
            at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

    console.error
      Error: Unhandled error. (Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
          at EventEmitter.emit (node:events:508:28)
          at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
            at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
            at Object.onceWrapper (node:events:622:28)
            at Socket.emit (node:events:508:28)
            at Socket._onTimeout (node:net:604:8)
            at listOnTimeout (node:internal/timers:605:17)
            at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

    console.error
      Error: Unhandled error. (Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
          at EventEmitter.emit (node:events:508:28)
          at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
            at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
            at Object.onceWrapper (node:events:622:28)
            at Socket.emit (node:events:508:28)
            at Socket._onTimeout (node:net:604:8)
            at listOnTimeout (node:internal/timers:605:17)
            at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

    console.error
      Error: Unhandled error. (Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11))
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
          at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
            at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
            at Object.onceWrapper (node:events:623:26)
            at EventEmitter.emit (node:events:520:35)
            at processTicksAndRejections (node:internal/process/task_queues:85:11)
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

    console.error
      Error: Unhandled error. (Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11))
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
          at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
            at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
            at Object.onceWrapper (node:events:623:26)
            at EventEmitter.emit (node:events:520:35)
            at processTicksAndRejections (node:internal/process/task_queues:85:11)
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

    console.error
      Error: Unhandled error. (Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11))
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
          at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
            at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
            at Object.onceWrapper (node:events:623:26)
            at EventEmitter.emit (node:events:520:35)
            at processTicksAndRejections (node:internal/process/task_queues:85:11)
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

    console.error
      Error: Unhandled error. (Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11))
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
          at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
            at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
            at Object.onceWrapper (node:events:623:26)
            at EventEmitter.emit (node:events:520:35)
            at processTicksAndRejections (node:internal/process/task_queues:85:11)
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

    console.error
      Error: Unhandled error. (Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11))
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
          at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
            at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
            at Object.onceWrapper (node:events:623:26)
            at EventEmitter.emit (node:events:520:35)
            at processTicksAndRejections (node:internal/process/task_queues:85:11)
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

 PASS  src/modules/payroll/payroll.service.test.ts (45.229 s)
 PASS  src/modules/styles/styles.test.ts (49.104 s)
 PASS  src/modules/gift-cards/gift-cards.test.ts (69.92 s)
 PASS  src/modules/loyalty/loyalty.service.test.ts (48.5 s)
 PASS  src/jobs/birthday.job.test.ts (52.887 s)
 PASS  src/modules/packages/packages.test.ts (93.839 s)
 PASS  src/modules/payroll/payroll.test.ts (104.538 s)
  ● Console

    console.error
      Error: Unhandled error. (Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
          at EventEmitter.emit (node:events:508:28)
          at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
            at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
            at Object.onceWrapper (node:events:622:28)
            at Socket.emit (node:events:508:28)
            at Socket._onTimeout (node:net:604:8)
            at listOnTimeout (node:internal/timers:605:17)
            at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

    console.error
      Error: Unhandled error. (Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11))
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
          at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
            at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
            at Object.onceWrapper (node:events:623:26)
            at EventEmitter.emit (node:events:520:35)
            at processTicksAndRejections (node:internal/process/task_queues:85:11)
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

 PASS  src/middleware/auth.test.ts (112.209 s)
 PASS  src/modules/health-flags/health-flags.test.ts (135.402 s)
  ● Console

    console.error
      Error: Unhandled error. (Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
          at EventEmitter.emit (node:events:508:28)
          at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
            at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
            at Object.onceWrapper (node:events:622:28)
            at Socket.emit (node:events:508:28)
            at Socket._onTimeout (node:net:604:8)
            at listOnTimeout (node:internal/timers:605:17)
            at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

    console.error
      Error: Unhandled error. (Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
          at EventEmitter.emit (node:events:508:28)
          at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
            at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
            at Object.onceWrapper (node:events:622:28)
            at Socket.emit (node:events:508:28)
            at Socket._onTimeout (node:net:604:8)
            at listOnTimeout (node:internal/timers:605:17)
            at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

    console.error
      Error: Unhandled error. (Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
          at EventEmitter.emit (node:events:508:28)
          at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
            at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
            at Object.onceWrapper (node:events:622:28)
            at Socket.emit (node:events:508:28)
            at Socket._onTimeout (node:net:604:8)
            at listOnTimeout (node:internal/timers:605:17)
            at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

    console.error
      Error: Unhandled error. (Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
          at EventEmitter.emit (node:events:508:28)
          at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
            at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
            at Object.onceWrapper (node:events:622:28)
            at Socket.emit (node:events:508:28)
            at Socket._onTimeout (node:net:604:8)
            at listOnTimeout (node:internal/timers:605:17)
            at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

    console.error
      Error: Unhandled error. (Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11))
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
          at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
            at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
            at Object.onceWrapper (node:events:623:26)
            at EventEmitter.emit (node:events:520:35)
            at processTicksAndRejections (node:internal/process/task_queues:85:11)
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

    console.error
      Error: Unhandled error. (Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11))
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
          at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
            at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
            at Object.onceWrapper (node:events:623:26)
            at EventEmitter.emit (node:events:520:35)
            at processTicksAndRejections (node:internal/process/task_queues:85:11)
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

    console.error
      Error: Unhandled error. (Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11))
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
          at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
            at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
            at Object.onceWrapper (node:events:623:26)
            at EventEmitter.emit (node:events:520:35)
            at processTicksAndRejections (node:internal/process/task_queues:85:11)
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

    console.error
      Error: Unhandled error. (Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11))
          at Queue.emit (node:events:497:17)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
          at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
          at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
          at RedisConnection.emit (node:events:508:28)
          at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
          at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
            at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
            at Object.onceWrapper (node:events:623:26)
            at EventEmitter.emit (node:events:520:35)
            at processTicksAndRejections (node:internal/process/task_queues:85:11)
      }

      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

 PASS  src/jobs/rebook-nudge.job.test.ts (73.212 s)

  ●  Cannot log after tests are done. Did you forget to wait for something async in your test?
    Attempted to log "Error: Unhandled error. (Error: connect ETIMEDOUT
        at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
        at Object.onceWrapper (node:events:622:28)
        at Socket.emit (node:events:508:28)
        at Socket._onTimeout (node:net:604:8)
        at listOnTimeout (node:internal/timers:605:17)
        at processTimers (node:internal/timers:541:7) {
      errorno: 'ETIMEDOUT',
      code: 'ETIMEDOUT',
      syscall: 'connect'
    })
        at Queue.emit (node:events:497:17)
        at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
        at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
        at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
        at RedisConnection.emit (node:events:508:28)
        at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
        at EventEmitter.emit (node:events:508:28)
        at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
        at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
        at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
        at Object.onceWrapper (node:events:622:28)
        at Socket.emit (node:events:508:28)
        at Socket._onTimeout (node:net:604:8)
        at listOnTimeout (node:internal/timers:605:17)
        at processTimers (node:internal/timers:541:7) {
      code: 'ERR_UNHANDLED_ERROR',
      context: Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      }
    }".

      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:171:41)
      at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:131:20)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)
      at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:171:41)
      at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }".
      at console.error (node_modules/@jest/console/build/BufferedConsole.js:127:10)
      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

 PASS  src/modules/pos/pos.test.ts (174.458 s)
 PASS  src/modules/memberships/memberships.test.ts (173.96 s)
 PASS  src/modules/whatsapp/whatsapp.queue.test.ts (25.79 s)

  ●  Cannot log after tests are done. Did you forget to wait for something async in your test?
    Attempted to log "Error: Unhandled error. (Error: Connection is closed.
        at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
        at Object.onceWrapper (node:events:623:26)
        at EventEmitter.emit (node:events:520:35)
        at processTicksAndRejections (node:internal/process/task_queues:85:11))
        at Queue.emit (node:events:497:17)
        at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
        at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
        at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
        at RedisConnection.emit (node:events:508:28)
        at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:135:41
        at processTicksAndRejections (node:internal/process/task_queues:104:5) {
      code: 'ERR_UNHANDLED_ERROR',
      context: Error: Connection is closed.
          at EventEmitter.connectionCloseHandler (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:208:28)
          at Object.onceWrapper (node:events:623:26)
          at EventEmitter.emit (node:events:520:35)
          at processTicksAndRejections (node:internal/process/task_queues:85:11)
    }".

      at EventEmitter.connectionCloseHandler (node_modules/ioredis/built/Redis.js:208:28)
      at processTicksAndRejections (node:internal/process/task_queues:85:11))
      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:131:20)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41
      at processTicksAndRejections (node:internal/process/task_queues:104:5) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: Connection is closed.
      at EventEmitter.connectionCloseHandler (node_modules/ioredis/built/Redis.js:208:28)
      }".
      at console.error (node_modules/@jest/console/build/BufferedConsole.js:127:10)
      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at node_modules/bullmq/src/classes/redis-connection.ts:135:41

 PASS  src/modules/uploads/uploads.test.ts (140.186 s)
 PASS  src/modules/artists/artist-media.service.test.ts (12.66 s)

  ●  Cannot log after tests are done. Did you forget to wait for something async in your test?
    Attempted to log "Error: Unhandled error. (Error: connect ETIMEDOUT
        at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
        at Object.onceWrapper (node:events:622:28)
        at Socket.emit (node:events:508:28)
        at Socket._onTimeout (node:net:604:8)
        at listOnTimeout (node:internal/timers:605:17)
        at processTimers (node:internal/timers:541:7) {
      errorno: 'ETIMEDOUT',
      code: 'ETIMEDOUT',
      syscall: 'connect'
    })
        at Queue.emit (node:events:497:17)
        at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:131:20)
        at Queue.emit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue.ts:193:18)
        at RedisConnection.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/queue-base.ts:76:56)
        at RedisConnection.emit (node:events:508:28)
        at EventEmitter.RedisConnection.handleClientError (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/bullmq/src/classes/redis-connection.ts:123:12)
        at EventEmitter.emit (node:events:508:28)
        at EventEmitter.silentEmit (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:529:30)
        at /Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/redis/event_handler.js:221:14
        at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:178:61)
        at Object.onceWrapper (node:events:622:28)
        at Socket.emit (node:events:508:28)
        at Socket._onTimeout (node:net:604:8)
        at listOnTimeout (node:internal/timers:605:17)
        at processTimers (node:internal/timers:541:7) {
      code: 'ERR_UNHANDLED_ERROR',
      context: Error: connect ETIMEDOUT
          at Socket.<anonymous> (/Users/neilapacesaite/Desktop/Automation/backend/node_modules/ioredis/built/Redis.js:171:41)
          at Object.onceWrapper (node:events:622:28)
          at Socket.emit (node:events:508:28)
          at Socket._onTimeout (node:net:604:8)
          at listOnTimeout (node:internal/timers:605:17)
          at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      }
    }".

      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:171:41)
      at processTimers (node:internal/timers:541:7) {
        errorno: 'ETIMEDOUT',
        code: 'ETIMEDOUT',
        syscall: 'connect'
      })
      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:131:20)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)
      at processTimers (node:internal/timers:541:7) {
        code: 'ERR_UNHANDLED_ERROR',
        context: Error: connect ETIMEDOUT
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:171:41)
      at processTimers (node:internal/timers:541:7) {
          errorno: 'ETIMEDOUT',
          code: 'ETIMEDOUT',
          syscall: 'connect'
        }
      }".
      at console.error (node_modules/@jest/console/build/BufferedConsole.js:127:10)
      at Queue.emit (node_modules/bullmq/src/classes/queue-base.ts:137:17)
      at Queue.emit (node_modules/bullmq/src/classes/queue.ts:193:18)
      at RedisConnection.<anonymous> (node_modules/bullmq/src/classes/queue-base.ts:76:56)
      at EventEmitter.RedisConnection.handleClientError (node_modules/bullmq/src/classes/redis-connection.ts:123:12)
      at EventEmitter.silentEmit (node_modules/ioredis/built/Redis.js:529:30)
      at node_modules/ioredis/built/redis/event_handler.js:221:14
      at Socket.<anonymous> (node_modules/ioredis/built/Redis.js:178:61)

 PASS  src/modules/social/social.test.ts (153.642 s)
 PASS  src/modules/push/push.service.test.ts (22.065 s)
 PASS  src/jobs/ai-suggestion.job.test.ts (19.364 s)
 PASS  src/modules/alerts/alerts.test.ts (167.554 s)
 PASS  src/modules/loyalty/loyalty.test.ts (64.586 s)
 PASS  src/modules/social/social.service.test.ts (36.288 s)
 PASS  src/middleware/requireLeadAccess.test.ts (33.503 s)
 PASS  src/jobs/no-show.job.test.ts (34.11 s)
 PASS  src/modules/customer-stats/customer-stats.test.ts (93.44 s)
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.

Summary of all failing tests
 FAIL  src/modules/public/public.test.ts (253.242 s)
  ● /api/public › POST /api/public/businesses/:slug/bookings › 201 — creates booking

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 500

      226 |         });
      227 |
    > 228 |       expect(res.status).toBe(201);
          |                          ^
      229 |       expect(res.body.data.publicToken).toBe('d4e5f6a7-b8c9-0123-def0-123456789abc');
      230 |     });
      231 |

      at Object.<anonymous> (src/modules/public/public.test.ts:228:26)

 FAIL  src/modules/pricing/pricing.test.ts (143.939 s)
  ● GET /api/pricing-rules › returns empty list when no rules

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      142 |       .set('Authorization', `Bearer ${adminToken}`);
      143 |
    > 144 |     expect(res.status).toBe(200);
          |                        ^
      145 |     expect(res.body.data).toEqual([]);
      146 |   });
      147 |

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:144:24)

  ● GET /api/pricing-rules › returns list of rules

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      153 |       .set('Authorization', `Bearer ${adminToken}`);
      154 |
    > 155 |     expect(res.status).toBe(200);
          |                        ^
      156 |     expect(res.body.data).toHaveLength(1);
      157 |     expect(res.body.data[0].id).toBe('rule_1');
      158 |   });

      at Object.<anonymous> (src/modules/pricing/pricing.test.ts:155:24)

 FAIL  src/modules/locations/locations.test.ts (78.128 s)
  ● GET /api/locations › returns empty list when no locations

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      121 |       .set('Authorization', `Bearer ${adminToken}`);
      122 |
    > 123 |     expect(res.status).toBe(200);
          |                        ^
      124 |     expect(res.body.data).toEqual([]);
      125 |   });
      126 |

      at Object.<anonymous> (src/modules/locations/locations.test.ts:123:24)

  ● GET /api/locations › returns list of locations

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      132 |       .set('Authorization', `Bearer ${adminToken}`);
      133 |
    > 134 |     expect(res.status).toBe(200);
          |                        ^
      135 |     expect(res.body.data).toHaveLength(1);
      136 |     expect(res.body.data[0].id).toBe('loc_1');
      137 |   });

      at Object.<anonymous> (src/modules/locations/locations.test.ts:134:24)

  ● GET /api/locations › filters by isActive=true

    expect(received).toBe(expected) // Object.is equality

    Expected: 200
    Received: 500

      144 |       .set('Authorization', `Bearer ${adminToken}`);
      145 |
    > 146 |     expect(res.status).toBe(200);
          |                        ^
      147 |     expect(mockLocationFindMany).toHaveBeenCalledWith(
      148 |       expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
      149 |     );

      at Object.<anonymous> (src/modules/locations/locations.test.ts:146:24)


Test Suites: 3 failed, 99 passed, 102 total
Tests:       6 failed, 1815 passed, 1821 total
Snapshots:   0 total
Time:        1347.099 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
