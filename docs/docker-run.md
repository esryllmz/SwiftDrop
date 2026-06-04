# SwiftDrop Docker Run Guide

SwiftDrop supports two local run modes:

- Fast development: run infrastructure with Docker Compose and start Spring Boot services from the IDE.
- Full demo/E2E: run infrastructure and all backend services with Docker Compose.

## Full Docker Mode

Build and start the full stack:

```powershell
docker compose up --build -d
```

This starts:

- `swiftdrop-postgres` on host port `5439`
- `swiftdrop-redis` on host port `6379`
- `swiftdrop-kafka` on host port `9092`
- `swiftdrop-kafka-ui` on host port `8090`
- `swiftdrop-auth-service` on host port `8081`
- `swiftdrop-logistics-service` on host port `8082`
- `swiftdrop-notification-service` on host port `8083`
- `swiftdrop-gateway` on host port `8080`

## Health Checks

```powershell
curl.exe http://localhost:8080/actuator/health
curl.exe http://localhost:8081/actuator/health
curl.exe http://localhost:8082/actuator/health
curl.exe http://localhost:8083/actuator/health
```

Each response should report `UP`.

## Useful Logs

```powershell
docker compose logs -f swiftdrop-auth-service
docker compose logs -f swiftdrop-logistics-service
docker compose logs -f swiftdrop-notification-service
docker compose logs -f swiftdrop-gateway
```

## Internal Docker Addresses

Containers use Docker service names, not `localhost`, for internal communication:

- Postgres: `postgres:5432`
- Redis: `redis:6379`
- Kafka: `kafka:29092`
- Auth service: `swiftdrop-auth-service:8081`
- Logistics service: `swiftdrop-logistics-service:8082`

From the host machine, keep using:

- Gateway: `http://localhost:8080`
- Kafka UI: `http://localhost:8090`
- Postgres: `localhost:5439`

## Stop

```powershell
docker compose down
```
