# SwiftDrop Postman Smoke Test Guide

This guide documents the backend smoke flow for validating the SwiftDrop demo stack through Gateway and direct service health endpoints.

## 1. Prerequisites

Docker infrastructure must be running:

- postgres
- redis
- kafka
- kafka-ui

Application services must be running:

- Gateway: `http://localhost:8080`
- Auth: `http://localhost:8081`
- Logistics: `http://localhost:8082`
- Notification: `http://localhost:8083`

Kafka UI:

- `http://localhost:8090`

## 2. Health Checks

Run:

```http
GET http://localhost:8080/actuator/health
GET http://localhost:8081/actuator/health
GET http://localhost:8082/actuator/health
GET http://localhost:8083/actuator/health
```

Expected:

- `status` is `UP`

## 3. Auth Smoke Flow

### Register

```http
POST http://localhost:8080/api/v1/auth/register
Content-Type: application/json
```

Body:

```json
{
  "email": "customer@swiftdrop.com",
  "password": "123456",
  "role": "CUSTOMER"
}
```

Expected:

- `200 OK` or `201 Created`
- Response may include `accessToken`

### Login

```http
POST http://localhost:8080/api/v1/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "customer@swiftdrop.com",
  "password": "123456"
}
```

Expected:

- `200 OK`
- Response body includes `accessToken`
- Cookie includes `refreshToken`

### Refresh

```http
POST http://localhost:8080/api/v1/auth/refresh
```

Expected:

- `200 OK`
- New `accessToken`
- `refreshToken` cookie is rotated

### Logout

```http
POST http://localhost:8080/api/v1/auth/logout
```

Expected:

- `200 OK`
- `refreshToken` cookie is cleared or revoked

## 4. Logistics / Order Flow

### Dashboard Summary

```http
GET http://localhost:8080/api/v1/dashboard/summary
```

### Merchants

```http
GET http://localhost:8080/api/v1/merchants
```

### Drivers

```http
GET http://localhost:8080/api/v1/drivers
```

### Orders

```http
GET http://localhost:8080/api/v1/orders
```

### Create Order

```http
POST http://localhost:8080/api/v1/orders
Content-Type: application/json
```

Body:

```json
{
  "customerId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "merchantId": "11111111-1111-1111-1111-111111111111",
  "totalAmount": 249.90
}
```

Expected:

- `201 Created`
- `driverName` may be populated
- `status` may be `DRIVER_ASSIGNED`

## 5. Outbox Verification

### Outbox List

```http
GET http://localhost:8080/api/v1/outbox-events
```

### Sent Events

```http
GET http://localhost:8080/api/v1/outbox-events?status=SENT
```

Expected:

- `ORDER_PLACED`
- `ORDER_DRIVER_ASSIGNED`
- `status` is `SENT`

Database check:

```powershell
docker exec -it swiftdrop-postgres psql -U swiftdrop_user -d swiftdrop_logistics_db -c "select event_type,status,retry_count,last_error from outbox_events order by created_at desc;"
```

## 6. Kafka UI Verification

URL:

- `http://localhost:8090`

Check:

- Topic: `order-events`
- Consumer group: `swiftdrop-notification-group`
- Lag: `0`
- DLT topic: `order-events.DLT` may not exist unless an error occurred

## 7. Redis Notification Idempotency Verification

Redis CLI:

```powershell
docker exec -it swiftdrop-redis redis-cli
```

Command:

```redis
KEYS notification:processed:*
```

Expected:

- Processed keys exist if the Notification consumer handled events

## 8. Useful Troubleshooting

- If Gateway `8080` is unavailable, start `GatewayApplication`.
- If tables are missing, Auth or Logistics services may not be running.
- In pgAdmin, check the correct databases:
  - `swiftdrop_auth_db`
  - `swiftdrop_logistics_db`
- If the Kafka consumer is missing, check whether `NotificationApplication` is running.
- If Gateway returns `404` or route errors, check route paths in `application.yml`.
- If the DLT topic does not exist, that can be normal when no errors occurred.

## 9. Expected Successful End State

- All health endpoints are `UP`
- Auth register/login/refresh/logout are OK
- Order create returns `201`
- Driver is assigned
- Outbox events are `SENT`
- Kafka consumer lag is `0`
- Redis processed keys exist
- `git status` is clean
