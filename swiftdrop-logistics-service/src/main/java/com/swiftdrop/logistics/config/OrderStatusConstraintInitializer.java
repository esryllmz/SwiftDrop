package com.swiftdrop.logistics.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OrderStatusConstraintInitializer implements CommandLineRunner {

    private static final String ADD_ORDER_VERSION_COLUMN = """
            alter table orders
            add column if not exists version bigint not null default 0
            """;

    private static final String ADD_ORDER_CANCELLED_AT_COLUMN = """
            alter table orders
            add column if not exists cancelled_at timestamp(6)
            """;

    private static final String ADD_ORDER_CANCELLED_BY_ACTOR_TYPE_COLUMN = """
            alter table orders
            add column if not exists cancelled_by_actor_type varchar(255)
            """;

    private static final String ADD_ORDER_CANCELLED_BY_ACTOR_ID_COLUMN = """
            alter table orders
            add column if not exists cancelled_by_actor_id uuid
            """;

    private static final String ADD_ORDER_CANCELLATION_REASON_COLUMN = """
            alter table orders
            add column if not exists cancellation_reason varchar(500)
            """;

    private static final String ADD_ORDER_PICKED_UP_AT_COLUMN = """
            alter table orders
            add column if not exists picked_up_at timestamp(6)
            """;

    private static final String ADD_ORDER_ON_THE_WAY_AT_COLUMN = """
            alter table orders
            add column if not exists on_the_way_at timestamp(6)
            """;

    private static final String ADD_ORDER_DELIVERED_AT_COLUMN = """
            alter table orders
            add column if not exists delivered_at timestamp(6)
            """;

    private static final String CREATE_ORDER_STATUS_HISTORY_TABLE = """
            create table if not exists order_status_history (
                id uuid not null,
                order_id uuid not null,
                from_status varchar(30),
                to_status varchar(30) not null,
                actor_type varchar(30) not null,
                actor_id uuid,
                reason varchar(500),
                created_at timestamp(6) not null,
                primary key (id)
            )
            """;

    private static final String ADD_ORDER_STATUS_HISTORY_ORDER_FK = """
            do $$
            begin
                if not exists (
                    select 1
                    from pg_constraint
                    where conname = 'fk_order_status_history_order'
                ) then
                    alter table order_status_history
                    add constraint fk_order_status_history_order
                    foreign key (order_id) references orders(id);
                end if;
            end $$;
            """;

    private static final String CREATE_ORDER_STATUS_HISTORY_ORDER_INDEX = """
            create index if not exists idx_order_status_history_order_created
            on order_status_history(order_id, created_at)
            """;

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
                'DELIVERED',
                'CANCELLED'
            ))
            """;

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        jdbcTemplate.execute(ADD_ORDER_VERSION_COLUMN);
        jdbcTemplate.execute(ADD_ORDER_CANCELLED_AT_COLUMN);
        jdbcTemplate.execute(ADD_ORDER_CANCELLED_BY_ACTOR_TYPE_COLUMN);
        jdbcTemplate.execute(ADD_ORDER_CANCELLED_BY_ACTOR_ID_COLUMN);
        jdbcTemplate.execute(ADD_ORDER_CANCELLATION_REASON_COLUMN);
        jdbcTemplate.execute(ADD_ORDER_PICKED_UP_AT_COLUMN);
        jdbcTemplate.execute(ADD_ORDER_ON_THE_WAY_AT_COLUMN);
        jdbcTemplate.execute(ADD_ORDER_DELIVERED_AT_COLUMN);
        jdbcTemplate.execute(CREATE_ORDER_STATUS_HISTORY_TABLE);
        jdbcTemplate.execute(ADD_ORDER_STATUS_HISTORY_ORDER_FK);
        jdbcTemplate.execute(CREATE_ORDER_STATUS_HISTORY_ORDER_INDEX);
        jdbcTemplate.execute(DROP_STATUS_CONSTRAINT);
        jdbcTemplate.execute(ADD_STATUS_CONSTRAINT);
    }
}
