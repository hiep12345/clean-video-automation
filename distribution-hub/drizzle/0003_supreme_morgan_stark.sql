CREATE TABLE `action_requests` (
	`idempotency_key` text PRIMARY KEY NOT NULL,
	`request_fingerprint` text NOT NULL,
	`job_id` text NOT NULL,
	`response_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `distribution_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
