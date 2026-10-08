CREATE TABLE `attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`code` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`password` text NOT NULL,
	`salt` text NOT NULL,
	`questions` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`number` integer NOT NULL,
	`questions` text NOT NULL,
	`answers` text NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`feedback_at` integer,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revision_student_number` ON `revisions` (`student_id`,`number`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`student_id` text,
	`expires` integer NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `lessons`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`pin` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `lessons`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_lesson_pin` ON `students` (`code`,`pin`);