package com.swiftdrop.logistics.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OrderStatusConstraintInitializer implements CommandLineRunner {

    private static final String DROP_STATUS_CONSTRAINT = """
            alter table orders
            drop constraint if exists orders_status_check
            """;

    private static final String ADD_STATUS_CONSTRAINT = """
            alter table orders
            add constraint orders_status_check
            check (status in (
                'PLACED',
                'PREPARING',
                'DRIVER_ASSIGNED',
                'READY_FOR_PICKUP',
                'PICKED_UP',
                'ON_THE_WAY',
                'DELIVERED'
            ))
            """;

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        jdbcTemplate.execute(DROP_STATUS_CONSTRAINT);
        jdbcTemplate.execute(ADD_STATUS_CONSTRAINT);
    }
}
