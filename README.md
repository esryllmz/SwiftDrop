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

Services:

- Postgres: `localhost:5439`
- Redis: `localhost:6379`
- Kafka: `localhost:9092`

Postgres databases are created by `init-scripts/init.sql`:

- `swiftdrop_auth_db`
- `swiftdrop_logistics_db`

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

Seed data is loaded automatically when the logistics service starts:

- Merchant: `11111111-1111-1111-1111-111111111111`
- Near driver: `22222222-2222-2222-2222-222222222222`
- Far driver: `33333333-3333-3333-3333-333333333333`

## Notification Service

The notification service runs on port `8083`, consumes Kafka `order-events`, and sends OneSignal web push notifications.

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
