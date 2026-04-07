CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "email" varchar UNIQUE NOT NULL,
  "password_hash" varchar NOT NULL,
  "username" varchar UNIQUE NOT NULL,
  "avatar_url" varchar,
  "nationality" varchar,
  "languages" varchar[],
  "token_version" int NOT NULL DEFAULT 1,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "places" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "name" varchar NOT NULL,
  "name_en" varchar,
  "description_en" text,
  "category" varchar NOT NULL,
  "district" varchar NOT NULL,
  "address" varchar,
  "lat" float NOT NULL,
  "lng" float NOT NULL,
  "location" geometry NOT NULL,
  "opening_hours" jsonb,
  "visit_duration_min" int,
  "image_url" varchar,
  "tags" varchar[],
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "trips" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "title" varchar,
  "num_days" int NOT NULL,
  "start_place_id" uuid,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "trip_days" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "trip_id" uuid NOT NULL,
  "day_number" int NOT NULL,
  "district" varchar
);

CREATE TABLE "trip_stops" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "trip_day_id" uuid NOT NULL,
  "place_id" uuid NOT NULL,
  "stop_order" int NOT NULL,
  "arrive_at" time,
  "depart_at" time,
  "distance_from_prev_m" int,
  "duration_from_prev_s" int,
  "is_skipped" boolean DEFAULT false
);

CREATE TABLE "activities" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "host_id" uuid NOT NULL,
  "place_id" uuid,
  "title" varchar NOT NULL,
  "description" text,
  "address" varchar,
  "lat" float NOT NULL,
  "lng" float NOT NULL,
  "location" geometry NOT NULL,
  "scheduled_at" timestamptz NOT NULL,
  "max_members" int DEFAULT 10,
  "status" varchar DEFAULT 'open',
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "activity_members" (
  "activity_id" uuid,
  "user_id" uuid,
  "status" varchar NOT NULL,
  "joined_at" timestamptz DEFAULT (now()),
  PRIMARY KEY ("activity_id", "user_id")
);

CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "activity_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "password_resets" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "token" varchar UNIQUE NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "type" varchar NOT NULL,
  "title" varchar NOT NULL,
  "body" varchar,
  "entity_type" varchar,
  "entity_id" uuid,
  "is_read" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz DEFAULT (now())
);

COMMENT ON COLUMN "users"."token_version" IS 'Tang len 1 khi logout/ban → invalidate tat ca JWT cu';

COMMENT ON COLUMN "places"."location" IS 'PostGIS Point(4326)';

COMMENT ON COLUMN "places"."opening_hours" IS '{"mon":"08:00-17:00",...}';

COMMENT ON COLUMN "trips"."num_days" IS 'K trong K-Means';

COMMENT ON COLUMN "trip_days"."district" IS 'Ket qua cluster K-Means';

COMMENT ON COLUMN "trip_stops"."distance_from_prev_m" IS 'OSRM result (meters)';

COMMENT ON COLUMN "trip_stops"."duration_from_prev_s" IS 'OSRM result (seconds)';

COMMENT ON COLUMN "activities"."location" IS 'PostGIS Point(4326)';

COMMENT ON COLUMN "activities"."status" IS 'open/closed/cancelled';

COMMENT ON COLUMN "activity_members"."status" IS 'pending/approved/rejected';

COMMENT ON COLUMN "password_resets"."token" IS 'Hashed reset token gui qua email';

COMMENT ON COLUMN "password_resets"."expires_at" IS 'Het han sau 15-30 phut';

COMMENT ON COLUMN "password_resets"."used_at" IS 'Null neu chua dung, co gia tri neu da reset xong';

COMMENT ON COLUMN "notifications"."type" IS 'activity_request / activity_approved / activity_rejected / new_message';

COMMENT ON COLUMN "notifications"."entity_type" IS 'activity / message';

COMMENT ON COLUMN "notifications"."entity_id" IS 'ID cua activity hoac message lien quan';

ALTER TABLE "trips" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trips" ADD FOREIGN KEY ("start_place_id") REFERENCES "places" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trip_days" ADD FOREIGN KEY ("trip_id") REFERENCES "trips" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trip_stops" ADD FOREIGN KEY ("trip_day_id") REFERENCES "trip_days" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "trip_stops" ADD FOREIGN KEY ("place_id") REFERENCES "places" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "activities" ADD FOREIGN KEY ("host_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "activities" ADD FOREIGN KEY ("place_id") REFERENCES "places" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "activity_members" ADD FOREIGN KEY ("activity_id") REFERENCES "activities" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "activity_members" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "messages" ADD FOREIGN KEY ("activity_id") REFERENCES "activities" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "messages" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "password_resets" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notifications" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
