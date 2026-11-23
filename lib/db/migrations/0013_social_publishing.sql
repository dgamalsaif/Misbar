CREATE TABLE "social_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text DEFAULT '' NOT NULL,
	"token_expires_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_post_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer NOT NULL,
	"connection_id" integer NOT NULL,
	"platform" text NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text NOT NULL,
	"status" text DEFAULT 'publishing' NOT NULL,
	"content" text NOT NULL,
	"external_post_id" text DEFAULT '' NOT NULL,
	"last_error" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "social_connections_platform_account_unique" ON "social_connections" USING btree ("platform","account_id");--> statement-breakpoint
CREATE INDEX "social_connections_platform_status_idx" ON "social_connections" USING btree ("platform","status");--> statement-breakpoint
CREATE UNIQUE INDEX "social_post_records_opportunity_account_unique" ON "social_post_records" USING btree ("opportunity_id","platform","account_id");--> statement-breakpoint
CREATE INDEX "social_post_records_opportunity_idx" ON "social_post_records" USING btree ("opportunity_id","created_at");