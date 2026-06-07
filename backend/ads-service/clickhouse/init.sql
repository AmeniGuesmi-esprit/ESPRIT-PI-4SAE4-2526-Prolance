-- =============================================================
-- ClickHouse Init: Kafka Engine → MergeTree via Materialized Views
-- =============================================================

CREATE DATABASE IF NOT EXISTS ads_analytics;

-- ─── AD EVENTS ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ads_analytics.ad_events_queue (
    adId        Int64,
    type        String,
    createdBy   String,
    userId      Int64,
    timestamp   String,
    ip          String,
    latitude    Float64,
    longitude   Float64,
    city        String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:29092',
    kafka_topic_list = 'ad-events',
    kafka_group_name = 'clickhouse-ad-events',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 1,
    kafka_skip_broken_messages = 100;

CREATE TABLE IF NOT EXISTS ads_analytics.ad_events (
    adId        Int64,
    type        String,
    createdBy   String,
    userId      Int64,
    event_time  DateTime DEFAULT now(),
    ip          String,
    latitude    Float64,
    longitude   Float64,
    city        String
) ENGINE = MergeTree()
ORDER BY (event_time, type, city)
TTL event_time + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS ads_analytics.ad_events_mv
TO ads_analytics.ad_events AS
SELECT
    adId,
    type,
    createdBy,
    userId,
    now() AS event_time,
    ip,
    latitude,
    longitude,
    city
FROM ads_analytics.ad_events_queue;

-- ─── MODERATION LOGS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ads_analytics.moderation_logs_queue (
    adId          Int64,
    userId        Int64,
    userEmail     String,
    title         String,
    description   String,
    violation     String,
    categoryCode  String,
    timestamp     String,
    ip            String,
    latitude      Float64,
    longitude     Float64,
    city          String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:29092',
    kafka_topic_list = 'moderation-logs',
    kafka_group_name = 'clickhouse-moderation-logs',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 1,
    kafka_skip_broken_messages = 100;

CREATE TABLE IF NOT EXISTS ads_analytics.moderation_logs (
    adId          Int64,
    userId        Int64,
    userEmail     String,
    title         String,
    description   String,
    violation     String,
    categoryCode  String,
    event_time    DateTime DEFAULT now(),
    ip            String,
    latitude      Float64,
    longitude     Float64,
    city          String
) ENGINE = MergeTree()
ORDER BY (event_time, categoryCode, city)
TTL event_time + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS ads_analytics.moderation_logs_mv
TO ads_analytics.moderation_logs AS
SELECT
    adId,
    userId,
    userEmail,
    title,
    description,
    violation,
    categoryCode,
    now() AS event_time,
    ip,
    latitude,
    longitude,
    city
FROM ads_analytics.moderation_logs_queue;

-- ─── USER ALERTS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ads_analytics.user_alerts_queue (
    userId      Int64,
    userEmail   String,
    message     String,
    priority    String,
    timestamp   String,
    ip          String,
    latitude    Float64,
    longitude   Float64,
    city        String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:29092',
    kafka_topic_list = 'user-alerts',
    kafka_group_name = 'clickhouse-user-alerts',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 1,
    kafka_skip_broken_messages = 100;

CREATE TABLE IF NOT EXISTS ads_analytics.user_alerts (
    userId      Int64,
    userEmail   String,
    message     String,
    priority    String,
    event_time  DateTime DEFAULT now(),
    ip          String,
    latitude    Float64,
    longitude   Float64,
    city        String
) ENGINE = MergeTree()
ORDER BY (event_time, priority, city)
TTL event_time + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS ads_analytics.user_alerts_mv
TO ads_analytics.user_alerts AS
SELECT
    userId,
    userEmail,
    message,
    priority,
    now() AS event_time,
    ip,
    latitude,
    longitude,
    city
FROM ads_analytics.user_alerts_queue;

-- ─── FLAGGED USERS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ads_analytics.flagged_users_queue (
    userId          Int64,
    email           String,
    violationCount  Int32,
    timestamp       String,
    status          String,
    ip              String,
    latitude        Float64,
    longitude       Float64,
    city            String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:29092',
    kafka_topic_list = 'flagged_users',
    kafka_group_name = 'clickhouse-flagged-users',
    kafka_format = 'JSONEachRow',
    kafka_num_consumers = 1,
    kafka_skip_broken_messages = 100;

CREATE TABLE IF NOT EXISTS ads_analytics.flagged_users (
    userId          Int64,
    email           String,
    violationCount  Int32,
    status          String,
    event_time      DateTime DEFAULT now(),
    ip              String,
    latitude        Float64,
    longitude       Float64,
    city            String
) ENGINE = MergeTree()
ORDER BY (event_time, status, city)
TTL event_time + INTERVAL 90 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS ads_analytics.flagged_users_mv
TO ads_analytics.flagged_users AS
SELECT
    userId,
    email,
    violationCount,
    status,
    now() AS event_time,
    ip,
    latitude,
    longitude,
    city
FROM ads_analytics.flagged_users_queue;
