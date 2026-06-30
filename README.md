# SwiftDrop

SwiftDrop is a multi-service delivery platform workspace.

## Modules

- `swiftdrop-gateway`
- `swiftdrop-auth-service`
- `swiftdrop-logistics-service`
- `swiftdrop-notification-service`
- `swiftdrop-ui`

## Local Infrastructure

Start the infrastructure from the repository root:

```bash
docker compose up -d
```

Host-exposed services:

- API Gateway: `http://localhost:8080`
- Kafka UI: `http://localhost:8090`
- Mailpit UI: `http://localhost:8025`

By default, only the frontend and API Gateway should be exposed to the host. Internal services communicate over the Docker network. Debug ports can be enabled with an optional compose override:

```bash
docker compose -f docker-compose.yml -f docker-compose.debug.yml up -d
```

Debug override ports:

- Auth Service: `localhost:8081`
- Logistics Service: `localhost:8082`
- Notification Service: `localhost:8083`
- Postgres: `localhost:5439`
- Redis: `localhost:6379`
- Kafka: `localhost:9092`
- Mailpit SMTP: `localhost:1025`

Postgres databases are created by `init-scripts/init.sql`:

- `swiftdrop_auth_db`
- `swiftdrop_logistics_db`

## Local Demo Credentials

Docker Compose seeds deterministic local demo accounts by default:

- Admin: `admin@swiftdrop.com` / `Admin123!`
- Customer: `customer@swiftdrop.demo` / `Demo123!`
- Merchant: `merchant@swiftdrop.demo` / `Demo123!`
- Courier: `courier@swiftdrop.demo` / `Demo123!`

These credentials are intended for local portfolio/demo runs only. Disable them with `DEMO_SEED_ENABLED=false` and `SEED_DATA_ENABLED=false` when running a non-demo profile.

## Auth Service

The auth service is a Spring Boot Maven project under `swiftdrop-auth-service`.

```bash
cd swiftdrop-auth-service
mvn test
mvn spring-boot:run
```

Health endpoint:

```bash
curl http://localhost:8081/api/v1/health
```

## Gateway

The gateway runs on port `8080` and routes requests to backend services.

```bash
cd swiftdrop-gateway
mvn test
mvn spring-boot:run
```

Routes:

- `/api/v1/auth/**` -> `http://localhost:8081`
- `/api/v1/orders/**` -> `http://localhost:8082`
- `/api/v1/logistics/**` -> `http://localhost:8082`
- `/api/v1/drivers/**` -> `http://localhost:8082`

## Logistics Service

The logistics service runs on port `8082` and uses Postgres, Redis, Redisson, and Kafka.

```bash
cd swiftdrop-logistics-service
mvn test
mvn spring-boot:run
```

Order endpoints:

- `POST /api/v1/orders`
- `PUT /api/v1/orders/{id}/status?status=DELIVERED`
- `POST /api/v1/drivers/location`

Demo seed data is loaded automatically by Docker Compose when the logistics service starts:

- Merchant: `11111111-1111-1111-1111-111111111111` (`merchant@swiftdrop.demo`)
- Demo courier: `22222222-2222-2222-2222-222222222222` (`courier@swiftdrop.demo`)
- Backup demo courier: `33333333-3333-3333-3333-333333333333`

The current MVP uses available courier assignment for demo clarity. Admin users can assign an unassigned placed order to the fixed demo courier from the Orders page. This makes the Courier portal flow deterministic for pickup, on-the-way, and delivered actions.

## Notification Service

The notification service consumes Kafka `order-events` and sends OneSignal web push notifications when production credentials are enabled.

```bash
cd swiftdrop-notification-service
mvn test
mvn spring-boot:run
```

Configure OneSignal credentials with environment variables:

```bash
ONESIGNAL_APP_ID=...
ONESIGNAL_API_KEY=...
```

OneSignal is implemented as a pluggable production notification provider and disabled by default in local development through mock mode. Real push delivery requires client subscription registration and a user-to-OneSignal subscription/player identifier mapping.

## Demo Technical Notes

SwiftDrop demonstrates Spring Boot 3 / Java 21 services, Spring Cloud Gateway, JWT authentication, role-based access control, Transactional Outbox, Kafka-driven notifications, Redis and database idempotency, optimistic locking with `@Version`, order status transition policy, status history tracking, secure password reset with hashed tokens, Mailpit local email sandboxing, aggregated admin monitoring, Docker Compose local infrastructure, Next.js role-based portals, MapStruct DTO mapping, and PostgreSQL persistence.

Planned production hardening includes Flyway baseline migrations, Redis-backed rate limiting, audit logging, CI pipeline, Playwright E2E tests, production OneSignal subscription mapping, and deployment/staging profiles.

Geo-based nearest courier assignment is planned as a future enhancement. It requires customer addresses, merchant pickup locations, courier live location tracking, and distance calculation.

Future courier assignment hardening:

- pickup deadline
- delivery deadline
- assignment expiration
- admin reassignment
- delayed order state
- courier no-show event

In production, an order can have multiple courier assignments over time. If a courier does not pick up or deliver within SLA, the assignment should expire and the order should be reassigned by the system or an admin.
