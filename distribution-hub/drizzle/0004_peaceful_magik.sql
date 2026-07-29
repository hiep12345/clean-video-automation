CREATE TABLE `publication_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_id` text NOT NULL,
	`namespace` text NOT NULL,
	`external_id` text NOT NULL,
	`permalink` text,
	`source` text NOT NULL,
	`verified_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`receipt_id`) REFERENCES `publication_receipts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_alias_namespace_id_uq` ON `publication_aliases` (`namespace`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `publication_alias_receipt_namespace_uq` ON `publication_aliases` (`receipt_id`,`namespace`);--> statement-breakpoint
CREATE TABLE `publication_receipt_events` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_email` text NOT NULL,
	`namespace` text,
	`external_id` text,
	`idempotency_key` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`receipt_id`) REFERENCES `publication_receipts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_receipt_event_idempotency_uq` ON `publication_receipt_events` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `publication_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`provider` text NOT NULL,
	`meta_content_id` text NOT NULL,
	`source_url` text NOT NULL,
	`publication_status` text NOT NULL,
	`analytics_link_status` text NOT NULL,
	`reported_by` text NOT NULL,
	`reported_at` text NOT NULL,
	`verified_at` text,
	`verification_error` text,
	FOREIGN KEY (`job_id`) REFERENCES `distribution_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_receipt_job_uq` ON `publication_receipts` (`job_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `publication_receipt_meta_content_uq` ON `publication_receipts` (`provider`,`meta_content_id`);--> statement-breakpoint
CREATE INDEX `publication_receipts_status_idx` ON `publication_receipts` (`analytics_link_status`,`reported_at`);--> statement-breakpoint
UPDATE `platforms`
SET `name` = 'Meta — Facebook + Instagram'
WHERE `code` = 'fb-ig';
