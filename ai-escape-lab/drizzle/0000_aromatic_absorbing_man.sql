CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`password` text NOT NULL,
	`salt` text NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`team` integer,
	`expires` integer NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`code` text NOT NULL,
	`number` integer NOT NULL,
	`state` text NOT NULL,
	PRIMARY KEY(`code`, `number`),
	FOREIGN KEY (`code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
