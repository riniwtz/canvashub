CREATE TYPE "contact_social_platform" AS ENUM('facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'youtube', 'github', 'website');--> statement-breakpoint
CREATE TYPE "tracked_account_status" AS ENUM('active', 'paused', 'archived', 'inactive');--> statement-breakpoint
CREATE TABLE "contact_social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"contact_id" uuid NOT NULL,
	"platform" "contact_social_platform" NOT NULL,
	"url" varchar(2048) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_social_links_url_protocol_check" CHECK ("url" ~* '^https?://')
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(120) NOT NULL,
	"nickname" varchar(80),
	"age" smallint,
	"birthday" date,
	"phone" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_name_length_check" CHECK (char_length(btrim("name")) between 1 and 120),
	CONSTRAINT "contacts_nickname_length_check" CHECK ("nickname" is null or char_length(btrim("nickname")) between 1 and 80),
	CONSTRAINT "contacts_age_check" CHECK ("age" is null or "age" between 0 and 150),
	CONSTRAINT "contacts_phone_length_check" CHECK ("phone" is null or char_length(btrim("phone")) between 1 and 32)
);
--> statement-breakpoint
CREATE TABLE "tracked_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_name" varchar(100) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_ciphertext" bytea NOT NULL,
	"password_salt" bytea NOT NULL,
	"password_iv" bytea NOT NULL,
	"password_auth_tag" bytea NOT NULL,
	"encryption_version" smallint DEFAULT 1 NOT NULL,
	"encryption_algorithm" varchar(32) DEFAULT 'aes-256-gcm' NOT NULL,
	"key_derivation_algorithm" varchar(32) DEFAULT 'argon2id' NOT NULL,
	"argon2_memory_cost" integer NOT NULL,
	"argon2_time_cost" integer NOT NULL,
	"argon2_parallelism" smallint NOT NULL,
	"notes" text,
	"account_by_contact_id" uuid,
	"status" "tracked_account_status" DEFAULT 'active'::"tracked_account_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracked_accounts_name_length_check" CHECK (char_length(btrim("account_name")) between 2 and 100),
	CONSTRAINT "tracked_accounts_email_length_check" CHECK (char_length(btrim("email")) between 3 and 254),
	CONSTRAINT "tracked_accounts_password_ciphertext_check" CHECK (octet_length("password_ciphertext") > 0),
	CONSTRAINT "tracked_accounts_password_salt_check" CHECK (octet_length("password_salt") = 16),
	CONSTRAINT "tracked_accounts_password_iv_check" CHECK (octet_length("password_iv") = 12),
	CONSTRAINT "tracked_accounts_password_auth_tag_check" CHECK (octet_length("password_auth_tag") = 16),
	CONSTRAINT "tracked_accounts_encryption_version_check" CHECK ("encryption_version" > 0),
	CONSTRAINT "tracked_accounts_encryption_algorithm_check" CHECK (char_length(btrim("encryption_algorithm")) > 0),
	CONSTRAINT "tracked_accounts_key_derivation_algorithm_check" CHECK (char_length(btrim("key_derivation_algorithm")) > 0),
	CONSTRAINT "tracked_accounts_argon2_memory_cost_check" CHECK ("argon2_memory_cost" > 0),
	CONSTRAINT "tracked_accounts_argon2_time_cost_check" CHECK ("argon2_time_cost" > 0),
	CONSTRAINT "tracked_accounts_argon2_parallelism_check" CHECK ("argon2_parallelism" > 0),
	CONSTRAINT "tracked_accounts_notes_length_check" CHECK ("notes" is null or char_length(btrim("notes")) between 3 and 2000)
);
--> statement-breakpoint
CREATE INDEX "contact_social_links_contact_id_idx" ON "contact_social_links" ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_social_links_contact_platform_url_uq" ON "contact_social_links" ("contact_id","platform","url");--> statement-breakpoint
CREATE INDEX "contacts_name_idx" ON "contacts" ("name");--> statement-breakpoint
CREATE INDEX "contacts_created_at_idx" ON "contacts" ("created_at");--> statement-breakpoint
CREATE INDEX "tracked_accounts_email_idx" ON "tracked_accounts" ("email");--> statement-breakpoint
CREATE INDEX "tracked_accounts_account_by_contact_id_idx" ON "tracked_accounts" ("account_by_contact_id");--> statement-breakpoint
CREATE INDEX "tracked_accounts_status_idx" ON "tracked_accounts" ("status");--> statement-breakpoint
CREATE INDEX "tracked_accounts_created_at_idx" ON "tracked_accounts" ("created_at");--> statement-breakpoint
ALTER TABLE "contact_social_links" ADD CONSTRAINT "contact_social_links_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tracked_accounts" ADD CONSTRAINT "tracked_accounts_account_by_contact_id_contacts_id_fkey" FOREIGN KEY ("account_by_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL;