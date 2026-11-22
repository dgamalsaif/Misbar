ALTER TABLE "research_programs" ADD COLUMN "country" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "research_programs" ADD COLUMN "application_deadline" date;