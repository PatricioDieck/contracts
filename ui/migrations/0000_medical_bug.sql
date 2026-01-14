CREATE TYPE "public"."case_status" AS ENUM('Funded', 'Submitted', 'Disputed', 'Resolved');--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"required" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id_on_chain" integer NOT NULL,
	"payer_address" text NOT NULL,
	"payee_address" text NOT NULL,
	"judge_address" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount_eth" numeric(18, 6) NOT NULL,
	"status" "case_status" DEFAULT 'Funded' NOT NULL,
	"specs_hash" text NOT NULL,
	"specs_blob_url" text,
	"deliverables_hash" text,
	"deliverables_blob_url" text,
	"review_deadline" timestamp,
	"ai_winner" text,
	"ai_rationale" text,
	"ai_rationale_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"disputed_at" timestamp,
	"resolved_at" timestamp,
	CONSTRAINT "cases_case_id_on_chain_unique" UNIQUE("case_id_on_chain")
);
--> statement-breakpoint
CREATE TABLE "deliverables" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"blob_url" text NOT NULL,
	"file_size_bytes" integer,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;