CREATE TABLE `channel_assignments` (
	`member_email` text NOT NULL,
	`channel_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`member_email`) REFERENCES `team_members`(`email`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_assignment_uq` ON `channel_assignments` (`member_email`,`channel_id`);--> statement-breakpoint
CREATE TABLE `team_events` (
	`id` text PRIMARY KEY NOT NULL,
	`member_email` text NOT NULL,
	`actor_email` text NOT NULL,
	`event_type` text NOT NULL,
	`member_version` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_event_idempotency_uq` ON `team_events` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_event_member_version_uq` ON `team_events` (`member_email`,`member_version`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
