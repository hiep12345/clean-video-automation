CREATE TABLE `publication_alias_ingest_batches` (
	`idempotency_key` text PRIMARY KEY NOT NULL,
	`source_system` text NOT NULL,
	`actor` text NOT NULL,
	`payload_hash` text NOT NULL,
	`item_count` integer NOT NULL,
	`response_json` text NOT NULL,
	`created_at` text NOT NULL
);
