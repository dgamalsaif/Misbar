CREATE TABLE "registration_invoice_records" (
	"registration_id" integer PRIMARY KEY NOT NULL,
	"original_sar" integer,
	"discounted_sar" integer,
	"total_seats" integer,
	"remaining_seats" integer,
	"specialty" text DEFAULT '' NOT NULL,
	"journal_target" text DEFAULT '' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"payment_paid_at" timestamp,
	"payment_marked_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_payment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"registration_id" integer NOT NULL,
	"status" text NOT NULL,
	"recorded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registration_invoice_records" ADD CONSTRAINT "registration_invoice_records_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_payment_events" ADD CONSTRAINT "registration_payment_events_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registration_payment_events_registration_created_idx" ON "registration_payment_events" USING btree ("registration_id","created_at");
--> statement-breakpoint
-- Historical registrations did not store invoice snapshots. Seed available program fees and labels once.
INSERT INTO "registration_invoice_records" (
	"registration_id", "original_sar", "discounted_sar", "total_seats", "specialty", "journal_target"
)
SELECT
	r."id",
	p."price_original_sar",
	p."price_discounted_sar",
	p."total_seats",
	COALESCE(NULLIF(p."specialty_ar", ''), p."specialty_en", ''),
	COALESCE(p."journal_target", '')
FROM "registrations" r
JOIN "research_programs" p ON p."id" = r."research_id"
ON CONFLICT ("registration_id") DO NOTHING;