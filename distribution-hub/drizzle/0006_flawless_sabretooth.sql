CREATE TABLE `publication_receipt_action_requests` (
	`idempotency_key` text PRIMARY KEY NOT NULL,
	`request_fingerprint` text NOT NULL,
	`receipt_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`receipt_id`) REFERENCES `publication_receipts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `publication_receipts_status_idx` ON `publication_receipts` (`analytics_link_status`,`reported_at`);
