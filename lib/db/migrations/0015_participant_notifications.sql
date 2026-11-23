CREATE TABLE "participant_notification_access_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_notification_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"recipient_email" text NOT NULL,
	"channel" text NOT NULL,
	"target_key" text NOT NULL,
	"push_subscription_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "participant_notification_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"stage" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"published_by" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "participant_notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_access_link_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"opportunity_id" integer NOT NULL,
	"recipient_email" text NOT NULL,
	"stage" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "participant_push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant_notification_deliveries" ADD CONSTRAINT "participant_notification_deliveries_event_id_participant_notification_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."participant_notification_events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "participant_notifications" ADD CONSTRAINT "participant_notifications_event_id_participant_notification_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."participant_notification_events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "participant_notification_access_tokens_hash_unique" ON "participant_notification_access_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "participant_notification_access_tokens_email_purpose_idx" ON "participant_notification_access_tokens" USING btree ("email","purpose","created_at");
--> statement-breakpoint
CREATE INDEX "participant_notification_access_tokens_expiry_idx" ON "participant_notification_access_tokens" USING btree ("expires_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "participant_notification_deliveries_event_channel_target_unique" ON "participant_notification_deliveries" USING btree ("event_id","channel","target_key");
--> statement-breakpoint
CREATE INDEX "participant_notification_deliveries_status_created_idx" ON "participant_notification_deliveries" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "participant_notification_deliveries_event_status_idx" ON "participant_notification_deliveries" USING btree ("event_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "participant_notification_events_idempotency_unique" ON "participant_notification_events" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "participant_notification_events_status_created_idx" ON "participant_notification_events" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "participant_notification_events_opportunity_created_idx" ON "participant_notification_events" USING btree ("opportunity_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "participant_notification_preferences_email_unique" ON "participant_notification_preferences" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "participant_notifications_event_email_unique" ON "participant_notifications" USING btree ("event_id","recipient_email");
--> statement-breakpoint
CREATE INDEX "participant_notifications_email_created_idx" ON "participant_notifications" USING btree ("recipient_email","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "participant_push_subscriptions_endpoint_unique" ON "participant_push_subscriptions" USING btree ("endpoint");
--> statement-breakpoint
CREATE INDEX "participant_push_subscriptions_email_status_idx" ON "participant_push_subscriptions" USING btree ("email","status");
