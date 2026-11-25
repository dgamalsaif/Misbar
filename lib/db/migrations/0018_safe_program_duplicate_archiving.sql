CREATE TABLE "research_program_archive_records" (
	"research_id" integer PRIMARY KEY NOT NULL,
	"canonical_research_id" integer NOT NULL,
	"previous_status" text NOT NULL,
	"is_archived" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp DEFAULT now() NOT NULL,
	"archived_by" text NOT NULL,
	"restored_at" timestamp,
	"restored_by" text
);
--> statement-breakpoint
ALTER TABLE "research_program_archive_records" ADD CONSTRAINT "research_program_archive_records_research_id_research_programs_id_fk" FOREIGN KEY ("research_id") REFERENCES "public"."research_programs"("id") ON DELETE cascade ON UPDATE no action;
