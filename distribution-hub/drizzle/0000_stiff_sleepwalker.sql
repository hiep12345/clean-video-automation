CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'slate' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channels_code_unique` ON `channels` (`code`);--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`title` text NOT NULL,
	`content_type` text NOT NULL,
	`drive_url` text,
	`produced_at` text,
	`qa_score` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `distribution_events` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`event_type` text NOT NULL,
	`state` text NOT NULL,
	`actor_email` text NOT NULL,
	`assignee_email` text,
	`claim_expires_at` text,
	`blocked_reason` text,
	`scheduled_at` text,
	`uploaded_at` text,
	`external_url` text,
	`idempotency_key` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `distribution_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `distribution_event_sequence_uq` ON `distribution_events` (`job_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `distribution_event_idempotency_uq` ON `distribution_events` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `distribution_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`platform_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`platform_id`) REFERENCES `platforms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `distribution_job_target_uq` ON `distribution_jobs` (`content_id`,`platform_id`);--> statement-breakpoint
CREATE TABLE `platforms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'slate' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platforms_code_unique` ON `platforms` (`code`);