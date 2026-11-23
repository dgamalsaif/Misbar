CREATE TABLE "social_seat_update_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"platform" text NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text NOT NULL,
	"status" text DEFAULT 'publishing' NOT NULL,
	"content" text NOT NULL,
	"external_post_id" text DEFAULT '' NOT NULL,
	"last_error" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "social_seat_update_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"registration_id" integer NOT NULL,
	"opportunity_id" integer NOT NULL,
	"seats_left" integer NOT NULL,
	"total_seats" integer NOT NULL,
	"first_author_seats_left" integer NOT NULL,
	"co_author_seats_left" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "social_seat_update_deliveries_event_account_unique" ON "social_seat_update_deliveries" USING btree ("event_id","platform","account_id");--> statement-breakpoint
CREATE INDEX "social_seat_update_deliveries_event_status_idx" ON "social_seat_update_deliveries" USING btree ("event_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "social_seat_update_events_registration_unique" ON "social_seat_update_events" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX "social_seat_update_events_status_created_idx" ON "social_seat_update_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "social_seat_update_events_opportunity_created_idx" ON "social_seat_update_events" USING btree ("opportunity_id","created_at");