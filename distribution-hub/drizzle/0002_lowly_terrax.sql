CREATE TABLE `content_ingest_records` (
	`content_id` text PRIMARY KEY NOT NULL,
	`source_system` text NOT NULL,
	`source_revision` text NOT NULL,
	`source_updated_at` text NOT NULL,
	`drive_file_id` text NOT NULL,
	`asset_hash` text NOT NULL,
	`distribution_revision` text NOT NULL,
	`qa_receipt_hash` text NOT NULL,
	`payload_hash` text NOT NULL,
	`first_ingested_at` text NOT NULL,
	`last_ingested_at` text NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_ingest_artifact_uq` ON `content_ingest_records` (`drive_file_id`,`distribution_revision`);--> statement-breakpoint
CREATE TABLE `ingest_batches` (
	`idempotency_key` text PRIMARY KEY NOT NULL,
	`source_system` text NOT NULL,
	`actor` text NOT NULL,
	`payload_hash` text NOT NULL,
	`item_count` integer NOT NULL,
	`response_json` text NOT NULL,
	`created_at` text NOT NULL
);
