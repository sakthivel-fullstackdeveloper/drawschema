-- BeeHub HRMS Database Schema Create Commands
-- Generated on 2026-07-16T07:29:47.506Z
-- Database: beehub

-- -----------------------------------------------------
-- Table `answers`
-- -----------------------------------------------------
CREATE TABLE `answers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `question_id` int unsigned NOT NULL COMMENT 'Reference to questions table',
  `answer` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Answer text',
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID of the user who answered',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_answers_question_id` (`question_id`),
  KEY `idx_answers_user_id` (`user_id`),
  CONSTRAINT `fk_answers_question_id` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=423 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Answers to performance review questions';

-- -----------------------------------------------------
-- Table `approval_workflow_assignments`
-- -----------------------------------------------------
CREATE TABLE `approval_workflow_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(150) NOT NULL,
  `workflow_id` int NOT NULL,
  `priority` int NOT NULL DEFAULT '100',
  `applicable_leave_type_id` json DEFAULT NULL,
  `min_duration_units` float DEFAULT NULL,
  `applicable_requestor_department` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_awa_rule_name` (`rule_name`),
  KEY `approval_workflow_assignments_workflow_id` (`workflow_id`),
  CONSTRAINT `approval_workflow_assignments_ibfk_1` FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflows` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `approval_workflow_steps`
-- -----------------------------------------------------
CREATE TABLE `approval_workflow_steps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workflow_id` int NOT NULL,
  `step_number` int NOT NULL,
  `approver_role` varchar(255) DEFAULT NULL,
  `approver_user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_workflow_step` (`workflow_id`,`step_number`),
  KEY `approval_workflow_steps_workflow_id` (`workflow_id`),
  KEY `approval_workflow_steps_approver_user_id` (`approver_user_id`),
  CONSTRAINT `approval_workflow_steps_ibfk_7` FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflows` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `approval_workflow_steps_ibfk_8` FOREIGN KEY (`approver_user_id`) REFERENCES `personal_profiles` (`user_id`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `approval_workflows`
-- -----------------------------------------------------
CREATE TABLE `approval_workflows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workflow_name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_workflow_name` (`workflow_name`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `assigned_shifts`
-- -----------------------------------------------------
CREATE TABLE `assigned_shifts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `employee_code` varchar(255) NOT NULL,
  `shift_id` int unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assigned_shifts_user_id_employee_code` (`user_id`,`employee_code`),
  KEY `assigned_shifts_shift_id` (`shift_id`),
  CONSTRAINT `assigned_shifts_ibfk_1` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `attendance_policies`
-- -----------------------------------------------------
CREATE TABLE `attendance_policies` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `employee_code` varchar(255) NOT NULL,
  `policy_name` varchar(255) NOT NULL,
  `entitlement` varchar(255) NOT NULL,
  `request_raising_for_past_dates` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `attendance_regularizations`
-- -----------------------------------------------------
CREATE TABLE `attendance_regularizations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `employee_code` varchar(255) NOT NULL,
  `attendance_id` int unsigned NOT NULL,
  `regularization_type` enum('on_duty','missed_punch','work_from_home') NOT NULL,
  `attendance_date` date NOT NULL,
  `regularization_date` date NOT NULL,
  `regularization_in_time` datetime DEFAULT NULL,
  `regularization_out_time` datetime DEFAULT NULL,
  `reason` text NOT NULL,
  `reject_reason` text,
  `notify_to` json NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','CANCELLED') DEFAULT 'PENDING',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `approved_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attendance_id` (`attendance_id`),
  CONSTRAINT `attendance_regularizations_ibfk_1` FOREIGN KEY (`attendance_id`) REFERENCES `attendances` (`id`) ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=376 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `attendances`
-- -----------------------------------------------------
CREATE TABLE `attendances` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `employee_code` varchar(40) NOT NULL,
  `shift_id` int unsigned NOT NULL,
  `date` date NOT NULL,
  `check_in` datetime DEFAULT NULL,
  `check_out` datetime DEFAULT NULL,
  `start_break_time` datetime DEFAULT NULL,
  `end_break_time` datetime DEFAULT NULL,
  `total_break_time` float NOT NULL DEFAULT '0',
  `worked_hours` float NOT NULL DEFAULT '0',
  `regularization` enum('on_duty','missed_punch','forgot_id_card','work_from_home','comp_off_credit') DEFAULT NULL,
  `status` enum('present','late','overtime','first_day_off','second_day_off','compensatory_off','leave','early','minimum_work_hours_not_met','absent','pending','auto_clocked_out','week_off','holiday') NOT NULL DEFAULT 'absent',
  `notes` varchar(500) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `source` enum('web','app') NOT NULL DEFAULT 'web',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_date` (`user_id`,`date`),
  KEY `shift_id` (`shift_id`),
  CONSTRAINT `attendances_ibfk_1` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=8432 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `chat_limits`
-- -----------------------------------------------------
CREATE TABLE `chat_limits` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `max_messages` int NOT NULL COMMENT 'Maximum number of messages allowed',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether the chat limit is active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_chat_limits_max_messages` CHECK ((`max_messages` >= 1))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chat limits for AI conversations';

-- -----------------------------------------------------
-- Table `comment_reactions`
-- -----------------------------------------------------
CREATE TABLE `comment_reactions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `comment_id` int unsigned NOT NULL COMMENT 'Reference to comments table',
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'User ID who liked the comment',
  `is_liked` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether the comment is liked',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_comment_user_reaction` (`comment_id`,`user_id`),
  KEY `idx_comment_reactions_comment_id` (`comment_id`),
  KEY `idx_comment_reactions_user_id` (`user_id`),
  CONSTRAINT `fk_comment_reactions_comment_id` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reactions to comments';

-- -----------------------------------------------------
-- Table `comments`
-- -----------------------------------------------------
CREATE TABLE `comments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'User ID who created the comment',
  `post_id` int unsigned NOT NULL COMMENT 'Reference to posts table',
  `msg` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Comment message content',
  `file` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Optional file URL attachment',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_comments_post_id` (`post_id`),
  KEY `idx_comments_user_id` (`user_id`),
  KEY `idx_comments_created_at` (`created_at`),
  CONSTRAINT `fk_comments_post_id` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comments on posts';

-- -----------------------------------------------------
-- Table `conversations`
-- -----------------------------------------------------
CREATE TABLE `conversations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID of the user',
  `title` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Conversation title',
  `model_name` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'AI model name used',
  `chat_limit_id` int unsigned NOT NULL COMMENT 'Reference to chat_limits table',
  `status` enum('Active','InActive','Deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Active' COMMENT 'Conversation status',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_conversations_chat_limit_id` (`chat_limit_id`),
  KEY `idx_conversations_user_id` (`user_id`),
  KEY `idx_conversations_status` (`status`),
  CONSTRAINT `fk_conversations_chat_limit_id` FOREIGN KEY (`chat_limit_id`) REFERENCES `chat_limits` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=166 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI chat conversations';

-- -----------------------------------------------------
-- Table `departments`
-- -----------------------------------------------------
CREATE TABLE `departments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `time_line_id` int unsigned NOT NULL,
  `department` varchar(255) NOT NULL,
  `reporting_manager` char(36) NOT NULL,
  `review_star` float DEFAULT NULL,
  `review_comments` varchar(1000) DEFAULT NULL,
  `dept_progress` float DEFAULT NULL,
  `completion_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_time_line_id` (`time_line_id`),
  KEY `idx_reporting_manager` (`reporting_manager`),
  CONSTRAINT `fk_departments_time_line_id` FOREIGN KEY (`time_line_id`) REFERENCES `time_lines` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `check_dept_progress_range` CHECK (((`dept_progress` is null) or ((`dept_progress` >= 0) and (`dept_progress` <= 100)))),
  CONSTRAINT `check_review_star_range` CHECK (((`review_star` is null) or ((`review_star` >= 1) and (`review_star` <= 5))))
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------
-- Table `document_files`
-- -----------------------------------------------------
CREATE TABLE `document_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `folder_id` int NOT NULL,
  `file` varchar(1000) NOT NULL,
  `file_size` bigint NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `folder_id` (`folder_id`),
  CONSTRAINT `document_files_ibfk_1` FOREIGN KEY (`folder_id`) REFERENCES `document_folders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=183 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `document_folders`
-- -----------------------------------------------------
CREATE TABLE `document_folders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `heading` varchar(255) NOT NULL,
  `created_by` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `no_of_files` int NOT NULL DEFAULT '0',
  `folder_size` bigint NOT NULL,
  `folder_type` enum('PDF','DOC','MP4','PPT','MIXED') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_updated_by` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `draft_financial_profiles`
-- -----------------------------------------------------
CREATE TABLE `draft_financial_profiles` (
  `draft_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL COMMENT 'Draft ID field is immutable once set',
  `employee_code` varchar(20) DEFAULT NULL,
  `indian_bank_name` varchar(100) DEFAULT NULL,
  `indian_ifsc_code` varchar(11) DEFAULT NULL,
  `indian_beneficiary_name` varchar(100) DEFAULT NULL,
  `indian_bank_account_number` varchar(18) DEFAULT NULL,
  `indian_pan_card_number` varchar(10) DEFAULT NULL,
  `indian_pf_number` varchar(30) DEFAULT NULL,
  `indian_uan_number` varchar(12) DEFAULT NULL,
  `indian_aadhar_number` varchar(12) DEFAULT NULL,
  `canadian_beneficiary_name` varchar(100) DEFAULT NULL,
  `canadian_bank_name` varchar(100) DEFAULT NULL,
  `canadian_bank_account_number` varchar(12) DEFAULT NULL,
  `canadian_transit_number` varchar(5) DEFAULT NULL,
  `canadian_institution_number` varchar(3) DEFAULT NULL,
  `additional_data` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `timezone_id` int DEFAULT NULL,
  PRIMARY KEY (`draft_id`),
  UNIQUE KEY `unique_draft_financial_employee_code` (`employee_code`),
  KEY `draft_financial_profiles_timezone_id_foreign_idx` (`timezone_id`),
  CONSTRAINT `draft_financial_profiles_ibfk_1` FOREIGN KEY (`draft_id`) REFERENCES `draft_personal_profiles` (`draft_id`) ON UPDATE CASCADE,
  CONSTRAINT `draft_financial_profiles_timezone_id_foreign_idx` FOREIGN KEY (`timezone_id`) REFERENCES `time_zones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `draft_personal_profiles`
-- -----------------------------------------------------
CREATE TABLE `draft_personal_profiles` (
  `draft_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `gender` enum('Male','Female','Not to specify') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `age` tinyint unsigned DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `personal_email` varchar(255) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `blood_group` varchar(5) DEFAULT NULL,
  `emergency_contact` varchar(20) DEFAULT NULL,
  `emergency_relationship` varchar(50) DEFAULT NULL,
  `about_me_pdf` varchar(2048) DEFAULT NULL,
  `about_me_video` varchar(2048) DEFAULT NULL,
  `profile_picture` varchar(2048) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`draft_id`),
  UNIQUE KEY `unique_draft_personal_email` (`personal_email`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `draft_professional_profiles`
-- -----------------------------------------------------
CREATE TABLE `draft_professional_profiles` (
  `draft_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `employee_code` varchar(20) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `date_of_joining` date DEFAULT NULL,
  `experience_years` tinyint unsigned DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `sub_department` varchar(100) DEFAULT NULL,
  `work_email` varchar(255) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `reporting_manager` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL,
  `employment_status` enum('Pending','On Probation','Part Time','Freelancer','Confirmed','Contract','Intern','On Leave','Suspended','Relieved','Terminated','Absconding','Resigned','Retired') DEFAULT NULL,
  `last_working_day` date DEFAULT NULL,
  `probation_period_days` smallint unsigned DEFAULT NULL,
  `notice_during_probation` smallint unsigned DEFAULT NULL,
  `notice_after_probation` smallint unsigned DEFAULT NULL,
  `confirmation_date` date DEFAULT NULL,
  `retirement_age` tinyint unsigned DEFAULT '56',
  `tenure_last_date` date DEFAULT NULL,
  `ctc` decimal(15,2) DEFAULT NULL,
  `gross` decimal(15,2) DEFAULT NULL,
  `annual_salary` decimal(15,2) DEFAULT NULL,
  `monthly_salary` decimal(15,2) DEFAULT NULL,
  `general_plan_with_pf` tinyint(1) DEFAULT NULL,
  `general_plan_without_pf` tinyint(1) DEFAULT NULL,
  `role` enum('Admin','HR','Manager','Employee','SuperAdmin') DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `timezone_id` int DEFAULT NULL,
  PRIMARY KEY (`draft_id`),
  UNIQUE KEY `unique_draft_employee_code` (`employee_code`),
  UNIQUE KEY `unique_draft_work_email` (`work_email`),
  KEY `draft_professional_profiles_timezone_id_foreign_idx` (`timezone_id`),
  CONSTRAINT `draft_professional_profiles_ibfk_1` FOREIGN KEY (`draft_id`) REFERENCES `draft_personal_profiles` (`draft_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `draft_professional_profiles_timezone_id_foreign_idx` FOREIGN KEY (`timezone_id`) REFERENCES `time_zones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `financial_profiles`
-- -----------------------------------------------------
CREATE TABLE `financial_profiles` (
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL COMMENT 'User ID field is immutable once set',
  `employee_code` varchar(20) NOT NULL,
  `timezone_id` int NOT NULL,
  `indian_bank_name` varchar(100) DEFAULT NULL,
  `indian_ifsc_code` varchar(11) DEFAULT NULL,
  `indian_beneficiary_name` varchar(100) DEFAULT NULL,
  `indian_bank_account_number` varchar(18) DEFAULT NULL,
  `indian_pan_card_number` varchar(10) DEFAULT NULL,
  `indian_pf_number` varchar(30) DEFAULT NULL,
  `indian_uan_number` varchar(12) DEFAULT NULL,
  `indian_aadhar_number` varchar(12) DEFAULT NULL,
  `canadian_beneficiary_name` varchar(100) DEFAULT NULL,
  `canadian_bank_name` varchar(100) DEFAULT NULL,
  `canadian_bank_account_number` varchar(12) DEFAULT NULL,
  `canadian_transit_number` varchar(5) DEFAULT NULL,
  `canadian_institution_number` varchar(3) DEFAULT NULL,
  `additional_data` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `unique_employee_code` (`employee_code`),
  KEY `fk_financial_timezone_id` (`timezone_id`),
  CONSTRAINT `financial_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `financial_profiles_ibfk_2` FOREIGN KEY (`employee_code`) REFERENCES `professional_profiles` (`employee_code`) ON UPDATE CASCADE,
  CONSTRAINT `fk_financial_timezone_id` FOREIGN KEY (`timezone_id`) REFERENCES `time_zones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `holiday_assignments`
-- -----------------------------------------------------
CREATE TABLE `holiday_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(20) NOT NULL,
  `calendar_id` int NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `holiday_assignments_employee_code` (`employee_code`),
  KEY `holiday_assignments_calendar_id` (`calendar_id`),
  KEY `holiday_assignments_employee_code_calendar_id_effective_from` (`employee_code`,`calendar_id`,`effective_from`),
  KEY `holiday_assignments_employee_code_calendar_id_effective_to` (`employee_code`,`calendar_id`,`effective_to`),
  CONSTRAINT `holiday_assignments_ibfk_7` FOREIGN KEY (`employee_code`) REFERENCES `professional_profiles` (`employee_code`) ON UPDATE CASCADE,
  CONSTRAINT `holiday_assignments_ibfk_8` FOREIGN KEY (`calendar_id`) REFERENCES `holiday_calendars` (`id`) ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `holiday_assignments_backup_2026_03_16`
-- -----------------------------------------------------
CREATE TABLE `holiday_assignments_backup_2026_03_16` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(20) NOT NULL,
  `calendar_id` int NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `holiday_assignments_employee_code` (`employee_code`),
  KEY `holiday_assignments_calendar_id` (`calendar_id`),
  KEY `holiday_assignments_employee_code_calendar_id_effective_from` (`employee_code`,`calendar_id`,`effective_from`),
  KEY `holiday_assignments_employee_code_calendar_id_effective_to` (`employee_code`,`calendar_id`,`effective_to`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `holiday_calendars`
-- -----------------------------------------------------
CREATE TABLE `holiday_calendars` (
  `id` int NOT NULL AUTO_INCREMENT,
  `calendar_name` varchar(100) NOT NULL,
  `year` int NOT NULL,
  `applicable_region` varchar(10) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_calendar_name` (`calendar_name`),
  KEY `holiday_calendars_year` (`year`),
  KEY `holiday_calendars_applicable_region` (`applicable_region`),
  KEY `holiday_calendars_applicable_region_year` (`applicable_region`,`year`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `holiday_calendars_backup_2026_03_16`
-- -----------------------------------------------------
CREATE TABLE `holiday_calendars_backup_2026_03_16` (
  `id` int NOT NULL AUTO_INCREMENT,
  `calendar_name` varchar(100) NOT NULL,
  `year` int NOT NULL,
  `applicable_region` varchar(10) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_calendar_name` (`calendar_name`),
  KEY `holiday_calendars_year` (`year`),
  KEY `holiday_calendars_applicable_region` (`applicable_region`),
  KEY `holiday_calendars_applicable_region_year` (`applicable_region`,`year`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `holidays`
-- -----------------------------------------------------
CREATE TABLE `holidays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `holiday_date` date NOT NULL,
  `description` varchar(150) NOT NULL,
  `applicable_state` varchar(3) DEFAULT NULL,
  `holiday_type` enum('Mandatory','Optional') NOT NULL DEFAULT 'Mandatory' COMMENT 'Specifies if the holiday is mandatory for all or optional for individuals.',
  `calendar_id` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `holidays_calendar_id_holiday_date` (`calendar_id`,`holiday_date`),
  KEY `holidays_calendar_id` (`calendar_id`),
  CONSTRAINT `holidays_ibfk_1` FOREIGN KEY (`calendar_id`) REFERENCES `holiday_calendars` (`id`) ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `holidays_backup_2026_03_16`
-- -----------------------------------------------------
CREATE TABLE `holidays_backup_2026_03_16` (
  `id` int NOT NULL AUTO_INCREMENT,
  `holiday_date` date NOT NULL,
  `description` varchar(150) NOT NULL,
  `applicable_state` varchar(3) DEFAULT NULL,
  `holiday_type` enum('Mandatory','Optional') NOT NULL DEFAULT 'Mandatory' COMMENT 'Specifies if the holiday is mandatory for all or optional for individuals.',
  `calendar_id` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `holidays_calendar_id_holiday_date` (`calendar_id`,`holiday_date`),
  KEY `holidays_calendar_id` (`calendar_id`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `holidays_unified`
-- -----------------------------------------------------
CREATE TABLE `holidays_unified` (
  `id` int NOT NULL AUTO_INCREMENT,
  `holiday_name` varchar(150) NOT NULL COMMENT 'Name of the holiday',
  `holiday_type` enum('Mandatory','Optional') NOT NULL DEFAULT 'Mandatory' COMMENT 'Type of holiday',
  `timezone_id` int NOT NULL,
  `holiday_date` date NOT NULL COMMENT 'Date of the holiday (YYYY-MM-DD)',
  `calendar_year` int NOT NULL COMMENT 'Year extracted from holiday_date for efficient querying',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_calendar_year` (`calendar_year`),
  KEY `idx_country_year` (`calendar_year`),
  KEY `idx_holiday_date` (`holiday_date`),
  KEY `idx_country_date` (`holiday_date`),
  KEY `fk_holiday_timezone_id` (`timezone_id`),
  CONSTRAINT `fk_holiday_timezone_id` FOREIGN KEY (`timezone_id`) REFERENCES `time_zones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Unified holiday table - holidays mapped to employees via ProfessionalProfile.country';

-- -----------------------------------------------------
-- Table `individual_progress`
-- -----------------------------------------------------
CREATE TABLE `individual_progress` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `time_line_id` int unsigned NOT NULL COMMENT 'Reference to time_lines table',
  `department_id` int unsigned NOT NULL COMMENT 'Reference to departments table',
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID of the user',
  `individual_progress` float DEFAULT NULL COMMENT 'Individual progress value (0-100)',
  `performance_rating` float DEFAULT NULL COMMENT 'Performance rating value (0-5)',
  `review_comments` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Review comments',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_individual_progress_user_timeline_dept` (`time_line_id`,`department_id`,`user_id`),
  KEY `idx_individual_progress_user_id` (`user_id`),
  KEY `idx_individual_progress_time_line_id` (`time_line_id`),
  KEY `idx_individual_progress_department_id` (`department_id`),
  CONSTRAINT `fk_individual_progress_department_id` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_individual_progress_time_line_id` FOREIGN KEY (`time_line_id`) REFERENCES `time_lines` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_individual_progress_progress` CHECK (((`individual_progress` is null) or ((`individual_progress` >= 0) and (`individual_progress` <= 100)))),
  CONSTRAINT `chk_individual_progress_rating` CHECK (((`performance_rating` is null) or ((`performance_rating` >= 0) and (`performance_rating` <= 5))))
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Individual progress tracking for users';

-- -----------------------------------------------------
-- Table `jwt_sessions`
-- -----------------------------------------------------
CREATE TABLE `jwt_sessions` (
  `session_id` int NOT NULL AUTO_INCREMENT COMMENT 'Auto-incrementing primary key',
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `token` varchar(2048) NOT NULL,
  `is_valid` tinyint(1) NOT NULL DEFAULT '1',
  `expires_at` datetime NOT NULL,
  `otp` varchar(10) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `platform` varchar(25) DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  `token_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `token_id` (`token_id`),
  UNIQUE KEY `token_id_2` (`token_id`),
  UNIQUE KEY `idx_jwt_sessions_token` (`token`(255)),
  KEY `idx_jwt_sessions_user_id` (`user_id`),
  KEY `idx_jwt_sessions_expires_at` (`expires_at`),
  CONSTRAINT `jwt_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=19289 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `leave_approval_steps`
-- -----------------------------------------------------
CREATE TABLE `leave_approval_steps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `leave_request_id` int NOT NULL,
  `step_number` int NOT NULL,
  `approver_user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `approver_employee_id` varchar(255) NOT NULL,
  `status` enum('Pending','Approved','Rejected') NOT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_request_step` (`leave_request_id`,`step_number`),
  KEY `approver_user_id` (`approver_user_id`),
  CONSTRAINT `leave_approval_steps_ibfk_7` FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_approval_steps_ibfk_8` FOREIGN KEY (`approver_user_id`) REFERENCES `personal_profiles` (`user_id`) ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=166 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `leave_balance_adjustments`
-- -----------------------------------------------------
CREATE TABLE `leave_balance_adjustments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `adjusted_by_user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `adjusted_by_employee_id` varchar(255) NOT NULL,
  `target_user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `target_employee_id` varchar(255) NOT NULL,
  `leave_type_id` int NOT NULL,
  `adjustment_units` float NOT NULL,
  `reason` varchar(500) NOT NULL,
  `adjustment_timestamp` datetime NOT NULL,
  `source` enum('Manual','System Lapsed','Year End Carry-Forward','Year End Encashment') NOT NULL DEFAULT 'Manual' COMMENT 'The source of the balance adjustment (e.g., Manual by HR, System Lapsed, etc.)',
  `related_balance_record_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_balance_adjustments_target_user_id` (`target_user_id`),
  KEY `leave_balance_adjustments_target_employee_id` (`target_employee_id`),
  KEY `leave_balance_adjustments_leave_type_id` (`leave_type_id`),
  KEY `adjusted_by_user_id` (`adjusted_by_user_id`),
  KEY `related_balance_record_id` (`related_balance_record_id`),
  CONSTRAINT `leave_balance_adjustments_ibfk_13` FOREIGN KEY (`adjusted_by_user_id`) REFERENCES `personal_profiles` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_balance_adjustments_ibfk_14` FOREIGN KEY (`target_user_id`) REFERENCES `personal_profiles` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_balance_adjustments_ibfk_15` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_balance_adjustments_ibfk_16` FOREIGN KEY (`related_balance_record_id`) REFERENCES `leave_balances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `leave_balances`
-- -----------------------------------------------------
CREATE TABLE `leave_balances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `leave_type_id` int NOT NULL,
  `policy_id` int NOT NULL,
  `period_start_date` date NOT NULL,
  `period_end_date` date NOT NULL,
  `carried_forward_units` float NOT NULL DEFAULT '0',
  `accrued_units` float NOT NULL DEFAULT '0',
  `manual_adjustment_units` float NOT NULL DEFAULT '0',
  `used_units` float NOT NULL DEFAULT '0',
  `available_units` float NOT NULL DEFAULT '0',
  `availed_optional_holidays` int NOT NULL DEFAULT '0' COMMENT 'Tracks the count of optional holidays taken in this period.',
  `compensatory_days_earned` float NOT NULL DEFAULT '0' COMMENT 'Tracks compensatory days earned, e.g., by working on a mandatory holiday.',
  `last_updated` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_type_period` (`user_id`,`leave_type_id`,`period_start_date`),
  KEY `leave_balances_employee_id` (`employee_id`),
  KEY `leave_type_id` (`leave_type_id`),
  KEY `policy_id` (`policy_id`),
  CONSTRAINT `leave_balances_ibfk_10` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_balances_ibfk_11` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_balances_ibfk_12` FOREIGN KEY (`policy_id`) REFERENCES `leave_policies` (`id`) ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=496 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `leave_balances_new`
-- -----------------------------------------------------
CREATE TABLE `leave_balances_new` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(36) NOT NULL,
  `leave_policy_id` int NOT NULL,
  `year` int NOT NULL,
  `total_allocated` decimal(10,2) DEFAULT '0.00',
  `used` decimal(10,2) DEFAULT '0.00',
  `remaining` decimal(10,2) DEFAULT '0.00',
  `carried_forward` decimal(10,2) DEFAULT '0.00',
  `lapsed` decimal(10,2) DEFAULT '0.00',
  `encashed` decimal(10,2) DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_leave_year` (`user_id`,`leave_policy_id`,`year`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_leave_type_id` (`leave_policy_id`),
  KEY `idx_year` (`year`),
  CONSTRAINT `fk_leave_balance_policy` FOREIGN KEY (`leave_policy_id`) REFERENCES `leave_policies_new` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_carried_forward` CHECK ((`carried_forward` >= 0)),
  CONSTRAINT `chk_encashed` CHECK ((`encashed` >= 0)),
  CONSTRAINT `chk_lapsed` CHECK ((`lapsed` >= 0)),
  CONSTRAINT `chk_remaining` CHECK ((`remaining` >= 0)),
  CONSTRAINT `chk_total_allocated` CHECK ((`total_allocated` >= 0)),
  CONSTRAINT `chk_used` CHECK ((`used` >= 0)),
  CONSTRAINT `chk_year_range` CHECK (((`year` >= 2000) and (`year` <= 2100)))
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=183 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `leave_policies`
-- -----------------------------------------------------
CREATE TABLE `leave_policies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `policy_name` varchar(150) NOT NULL,
  `leave_type_id` int NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `initial_entitlement` float DEFAULT NULL,
  `accrual_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `accrual_frequency` enum('Monthly','Quarterly','Annually','Joining') DEFAULT NULL,
  `accrual_timing` enum('StartOfPeriod','EndOfPeriod') DEFAULT NULL,
  `accrual_amount` float DEFAULT NULL,
  `cap_accrual_at_max_balance` tinyint(1) NOT NULL DEFAULT '0',
  `max_balance` float DEFAULT NULL,
  `min_leave_duration` float DEFAULT NULL,
  `max_consecutive_days` int DEFAULT NULL,
  `min_notice_period_days` int DEFAULT NULL,
  `allow_negative_balance` tinyint(1) NOT NULL DEFAULT '0',
  `max_negative_balance` float DEFAULT NULL,
  `sandwich_policy_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `renewal_cycle` enum('CalendarYear','FinancialYear','JoiningAnniversary') NOT NULL,
  `allow_carry_forward` tinyint(1) NOT NULL DEFAULT '0',
  `max_carry_forward_units` float DEFAULT NULL,
  `carry_forward_expiry_months` int DEFAULT NULL,
  `allow_encashment_yearend` tinyint(1) NOT NULL DEFAULT '0',
  `max_encashment_units_yearend` float DEFAULT NULL,
  `new_hire_proration_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `new_hire_waiting_period_days` int DEFAULT NULL,
  `exit_proration_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `allow_encashment_on_exit` tinyint(1) NOT NULL DEFAULT '0',
  `forfeit_on_exit` tinyint(1) NOT NULL DEFAULT '1',
  `notice_period_leave_allowed` tinyint(1) NOT NULL DEFAULT '1',
  `optional_holiday_policy_enabled` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'If true, enables the special rules for optional holidays.',
  `max_optional_holidays_allowed` int DEFAULT NULL COMMENT 'The number of optional holidays a user can take before needing a compensatory day.',
  `allow_compensatory_from_holidays` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'If true, allows users to "earn" a day by working on a mandatory holiday to take an extra optional holiday.',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `policy_name` (`policy_name`),
  UNIQUE KEY `leave_policies_policy_name` (`policy_name`),
  UNIQUE KEY `policy_name_2` (`policy_name`),
  UNIQUE KEY `policy_name_3` (`policy_name`),
  UNIQUE KEY `policy_name_4` (`policy_name`),
  KEY `leave_policies_leave_type_id` (`leave_type_id`),
  CONSTRAINT `leave_policies_ibfk_1` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `leave_policies_new`
-- -----------------------------------------------------
CREATE TABLE `leave_policies_new` (
  `id` int NOT NULL AUTO_INCREMENT,
  `policy_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Human-readable name for this leave policy',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Optional description of the leave policy',
  `country` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Country code or name (e.g., India, Canada)',
  `leave_type_id` int NOT NULL COMMENT 'Foreign key to leave_types_new',
  `credit_frequency` enum('manual','monthly','yearly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'yearly',
  `credit_days` decimal(10,2) DEFAULT '0.00',
  `max_balance` decimal(10,2) DEFAULT '0.00',
  `carry_forward_days` decimal(10,2) DEFAULT '0.00',
  `encashment_allowed` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_country_leave_type` (`country`,`leave_type_id`),
  UNIQUE KEY `policy_name` (`policy_name`),
  KEY `idx_country` (`country`),
  KEY `idx_leave_type_id` (`leave_type_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_policy_leave_type` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types_new` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Country-specific leave policies for new leave system';

-- -----------------------------------------------------
-- Table `leave_policy_assignment_rules`
-- -----------------------------------------------------
CREATE TABLE `leave_policy_assignment_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(150) NOT NULL,
  `policy_id` int NOT NULL,
  `priority` int NOT NULL DEFAULT '100',
  `applicable_region` json DEFAULT NULL,
  `applicable_department` json DEFAULT NULL,
  `applicable_employment_type` json DEFAULT NULL,
  `applicable_user_id` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rule_name` (`rule_name`),
  UNIQUE KEY `leave_policy_assignment_rules_rule_name` (`rule_name`),
  UNIQUE KEY `rule_name_2` (`rule_name`),
  UNIQUE KEY `rule_name_3` (`rule_name`),
  UNIQUE KEY `rule_name_4` (`rule_name`),
  KEY `policy_id` (`policy_id`),
  CONSTRAINT `leave_policy_assignment_rules_ibfk_1` FOREIGN KEY (`policy_id`) REFERENCES `leave_policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `leave_policy_restrictions`
-- -----------------------------------------------------
CREATE TABLE `leave_policy_restrictions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `policy_id` int NOT NULL,
  `restriction_type` varchar(255) NOT NULL,
  `value_json` json NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_policy_restrictions_policy_id` (`policy_id`),
  CONSTRAINT `leave_policy_restrictions_ibfk_1` FOREIGN KEY (`policy_id`) REFERENCES `leave_policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `leave_requests`
-- -----------------------------------------------------
CREATE TABLE `leave_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `leave_type_id` int NOT NULL,
  `policy_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `number_of_units` float NOT NULL,
  `reason` text NOT NULL,
  `status` enum('Pending','Approved','Rejected','Cancelled','AutoApproved') NOT NULL DEFAULT 'Pending',
  `supporting_document_url` varchar(2048) DEFAULT NULL,
  `availed_optional_holiday_id` int DEFAULT NULL COMMENT 'If this leave corresponds to an optional holiday, this holds the ID of that holiday.',
  `notify_user_ids` json DEFAULT NULL,
  `request_timestamp` datetime NOT NULL,
  `approval_workflow_id` int DEFAULT NULL,
  `current_approver_step` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `start_date_period` enum('FullDay','FirstHalf','SecondHalf') NOT NULL DEFAULT 'FullDay',
  `end_date_period` enum('FullDay','FirstHalf','SecondHalf') NOT NULL DEFAULT 'FullDay',
  PRIMARY KEY (`id`),
  KEY `leave_requests_user_id` (`user_id`),
  KEY `leave_requests_employee_id` (`employee_id`),
  KEY `leave_requests_leave_type_id` (`leave_type_id`),
  KEY `leave_requests_status` (`status`),
  KEY `policy_id` (`policy_id`),
  KEY `availed_optional_holiday_id` (`availed_optional_holiday_id`),
  KEY `approval_workflow_id` (`approval_workflow_id`),
  CONSTRAINT `leave_requests_ibfk_16` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_requests_ibfk_17` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_requests_ibfk_18` FOREIGN KEY (`policy_id`) REFERENCES `leave_policies` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `leave_requests_ibfk_19` FOREIGN KEY (`availed_optional_holiday_id`) REFERENCES `holidays` (`id`),
  CONSTRAINT `leave_requests_ibfk_20` FOREIGN KEY (`approval_workflow_id`) REFERENCES `approval_workflows` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=214 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `leave_requests_new`
-- -----------------------------------------------------
CREATE TABLE `leave_requests_new` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `leave_policy_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `start_date_period` enum('FullDay','FirstHalf','SecondHalf') NOT NULL DEFAULT 'FullDay' COMMENT 'Whether the first day is a full day, first half, or second half',
  `end_date_period` enum('FullDay','FirstHalf','SecondHalf') NOT NULL DEFAULT 'FullDay' COMMENT 'Whether the last day is a full day, first half, or second half',
  `total_days` decimal(10,2) NOT NULL,
  `reason` text NOT NULL,
  `file` varchar(2048) DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `action_taken_date` datetime DEFAULT NULL,
  `action_taken_by` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL,
  `reject_comments` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notify_user_ids` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id_request` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_start_date` (`start_date`),
  KEY `idx_end_date` (`end_date`),
  KEY `idx_applied_at` (`applied_at`),
  KEY `fk_leave_request_action_by` (`action_taken_by`),
  KEY `idx_leave_policy_id_request` (`leave_policy_id`),
  CONSTRAINT `fk_leave_request_action_by` FOREIGN KEY (`action_taken_by`) REFERENCES `personal_profiles` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_request_policy` FOREIGN KEY (`leave_policy_id`) REFERENCES `leave_policies_new` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_request_user` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_end_date_after_start` CHECK ((`end_date` >= `start_date`)),
  CONSTRAINT `chk_total_days_positive` CHECK ((`total_days` >= 0.01))
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=226 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------
-- Table `leave_transactions`
-- -----------------------------------------------------
CREATE TABLE `leave_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `leave_policy_id` int NOT NULL,
  `transaction_type` enum('credit','debit','encash','carry-forward','lapse','rejected','cancelled','Pending','admin-adjustment') DEFAULT NULL,
  `days` decimal(10,2) NOT NULL,
  `reference_id` int DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id_transaction` (`user_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_transaction_date` (`transaction_date`),
  KEY `idx_reference_id` (`reference_id`),
  KEY `idx_leave_policy_id_transaction` (`leave_policy_id`),
  KEY `idx_user_leave_date` (`user_id`,`leave_policy_id`,`transaction_date`),
  CONSTRAINT `fk_leave_transaction_policy` FOREIGN KEY (`leave_policy_id`) REFERENCES `leave_policies_new` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_transaction_request` FOREIGN KEY (`reference_id`) REFERENCES `leave_requests_new` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_transaction_user` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=894 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------
-- Table `leave_types`
-- -----------------------------------------------------
CREATE TABLE `leave_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_name` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `short_name` varchar(5) NOT NULL,
  `unit` enum('Days','Hours') NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `is_paid` tinyint(1) NOT NULL DEFAULT '1',
  `is_optional_holiday` tinyint(1) NOT NULL DEFAULT '0',
  `gender_applicability` enum('All','Male','Female','Not to specify') NOT NULL DEFAULT 'All' COMMENT 'Specifies if this leave type is restricted to a specific gender.',
  `requires_document_threshold` float DEFAULT NULL,
  `color_code` varchar(7) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_type_name` (`type_name`),
  UNIQUE KEY `unique_short_name` (`short_name`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `leave_types_new`
-- -----------------------------------------------------
CREATE TABLE `leave_types_new` (
  `id` int NOT NULL AUTO_INCREMENT,
  `leave_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Name of the leave type (e.g., Annual Leave, Sick Leave)',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Optional description of the leave type',
  `is_paid` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if this leave type is paid or unpaid',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if this leave type is active and available for use',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_name` (`leave_name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_leave_name` (`leave_name`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Simplified leave type definitions for new leave system';

-- -----------------------------------------------------
-- Table `llm_usage`
-- -----------------------------------------------------
CREATE TABLE `llm_usage` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID of the user',
  `conversation_id` int unsigned NOT NULL COMMENT 'Reference to conversations table',
  `input_token` int NOT NULL COMMENT 'Number of input tokens used',
  `output_token` int NOT NULL COMMENT 'Number of output tokens used',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_llm_usage_user_id` (`user_id`),
  KEY `idx_llm_usage_conversation_id` (`conversation_id`),
  CONSTRAINT `fk_llm_usage_conversation_id` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_llm_usage_input_token` CHECK ((`input_token` >= 0)),
  CONSTRAINT `chk_llm_usage_output_token` CHECK ((`output_token` >= 0))
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=124 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='LLM token usage tracking';

-- -----------------------------------------------------
-- Table `messages`
-- -----------------------------------------------------
CREATE TABLE `messages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` int unsigned NOT NULL COMMENT 'Reference to conversations table',
  `role` enum('system','user','assistant') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Message role (system, user, assistant)',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Message content',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_conversation_id` (`conversation_id`),
  KEY `idx_messages_role` (`role`),
  CONSTRAINT `fk_messages_conversation_id` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=321 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Messages in AI chat conversations';

-- -----------------------------------------------------
-- Table `notifications`
-- -----------------------------------------------------
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('read','unread','deleted') NOT NULL DEFAULT 'unread',
  `date` varchar(50) NOT NULL,
  `time` varchar(50) NOT NULL,
  `profile_picture` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `type` enum('Delay','Leave','Attendance','Auto-clocked Out','Objective','Review','Alert','Achieved','Feed') NOT NULL,
  `action` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id` (`user_id`),
  KEY `notifications_status` (`status`),
  KEY `notifications_user_id_status` (`user_id`,`status`),
  KEY `notifications_created_at` (`created_at`),
  KEY `notifications_type` (`type`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=18670 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `objectives`
-- -----------------------------------------------------
CREATE TABLE `objectives` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `department_id` int unsigned NOT NULL,
  `objective` varchar(80) NOT NULL,
  `key_results` varchar(1000) NOT NULL,
  `files` text,
  `weightage` int DEFAULT NULL,
  `obj_progress` float DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_department_id` (`department_id`),
  CONSTRAINT `fk_objectives_department_id` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `check_obj_progress_range` CHECK (((`obj_progress` is null) or ((`obj_progress` >= 0) and (`obj_progress` <= 100)))),
  CONSTRAINT `check_weightage_range` CHECK (((`weightage` >= 1) and (`weightage` <= 100)))
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=434 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------
-- Table `organisation_field_options`
-- -----------------------------------------------------
CREATE TABLE `organisation_field_options` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `field_id` int unsigned NOT NULL COMMENT 'Foreign key referencing organisation_fields.id',
  `option` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Selectable option value (max 80 chars)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_field_option_field_id` (`field_id`),
  CONSTRAINT `fk_field_options_field_id` FOREIGN KEY (`field_id`) REFERENCES `organisation_fields` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Selectable option values for custom fields in Organisation Setup';

-- -----------------------------------------------------
-- Table `organisation_fields`
-- -----------------------------------------------------
CREATE TABLE `organisation_fields` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `field_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Human-readable display name of the field (max 80 chars)',
  `field_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Programmatic key used in code (max 100 chars)',
  `description` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Optional description explaining the purpose of the field',
  `module` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The HRMS module this field belongs to (e.g. leave, attendance)',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether this field is currently active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_field_key_per_module` (`field_key`,`module`),
  KEY `idx_field_module` (`module`),
  KEY `idx_field_is_active` (`is_active`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Custom field definitions used across HRMS modules';

-- -----------------------------------------------------
-- Table `perf_department_details`
-- -----------------------------------------------------
CREATE TABLE `perf_department_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dept_id` int NOT NULL,
  `time_line_id` int NOT NULL,
  `review_rating` float DEFAULT NULL,
  `review_comments` text,
  `dept_progress` float NOT NULL DEFAULT '0',
  `completion_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `reviewed_by` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_perf_dept_timeline` (`dept_id`,`time_line_id`),
  KEY `time_line_id` (`time_line_id`),
  KEY `perf_department_details_reviewed_by_foreign_idx` (`reviewed_by`),
  CONSTRAINT `perf_department_details_ibfk_1` FOREIGN KEY (`dept_id`) REFERENCES `perf_departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perf_department_details_ibfk_2` FOREIGN KEY (`time_line_id`) REFERENCES `perf_time_lines` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `perf_department_details_reviewed_by_foreign_idx` FOREIGN KEY (`reviewed_by`) REFERENCES `personal_profiles` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `perf_departments`
-- -----------------------------------------------------
CREATE TABLE `perf_departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dept_name` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `perf_individual_details`
-- -----------------------------------------------------
CREATE TABLE `perf_individual_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `time_line_id` int NOT NULL,
  `status` enum('not_started','on_track','behind','at_risk','completed') DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `review_rating` float DEFAULT NULL,
  `review_comments` text,
  `individual_progress` float NOT NULL DEFAULT '0',
  `reviewed_by` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_perf_timeline_user` (`time_line_id`,`user_id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_perf_individual_user` (`user_id`),
  CONSTRAINT `perf_individual_details_ibfk_1` FOREIGN KEY (`time_line_id`) REFERENCES `perf_time_lines` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `perf_individual_details_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perf_individual_details_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `personal_profiles` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=112 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `perf_obj_assignments`
-- -----------------------------------------------------
CREATE TABLE `perf_obj_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `obj_id` int NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_perf_obj_user` (`obj_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `perf_obj_assignments_ibfk_1` FOREIGN KEY (`obj_id`) REFERENCES `perf_objectives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perf_obj_assignments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=286 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `perf_obj_comment_mentions`
-- -----------------------------------------------------
CREATE TABLE `perf_obj_comment_mentions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comment_id` int NOT NULL,
  `mentioned_user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_perf_comment_mention` (`comment_id`,`mentioned_user_id`),
  KEY `idx_perf_mention_user` (`mentioned_user_id`),
  CONSTRAINT `perf_obj_comment_mentions_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `perf_obj_comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perf_obj_comment_mentions_ibfk_2` FOREIGN KEY (`mentioned_user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `perf_obj_comments`
-- -----------------------------------------------------
CREATE TABLE `perf_obj_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `obj_id` int NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `message` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_perf_comments_obj` (`obj_id`),
  KEY `idx_perf_comments_user` (`user_id`),
  CONSTRAINT `perf_obj_comments_ibfk_1` FOREIGN KEY (`obj_id`) REFERENCES `perf_objectives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perf_obj_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `perf_obj_department_map`
-- -----------------------------------------------------
CREATE TABLE `perf_obj_department_map` (
  `id` int NOT NULL AUTO_INCREMENT,
  `obj_id` int NOT NULL,
  `dept_id` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_perf_obj_dept` (`obj_id`,`dept_id`),
  KEY `dept_id` (`dept_id`),
  CONSTRAINT `perf_obj_department_map_ibfk_1` FOREIGN KEY (`obj_id`) REFERENCES `perf_objectives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perf_obj_department_map_ibfk_2` FOREIGN KEY (`dept_id`) REFERENCES `perf_departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=232 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `perf_obj_files`
-- -----------------------------------------------------
CREATE TABLE `perf_obj_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `obj_id` int NOT NULL,
  `file` varchar(2048) NOT NULL,
  `file_size` bigint NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_perf_obj_files_obj` (`obj_id`),
  CONSTRAINT `perf_obj_files_ibfk_1` FOREIGN KEY (`obj_id`) REFERENCES `perf_objectives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=522 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `perf_obj_history`
-- -----------------------------------------------------
CREATE TABLE `perf_obj_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `obj_id` int NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `changed_item` varchar(255) NOT NULL,
  `before` text NOT NULL,
  `after` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_perf_history_obj` (`obj_id`),
  KEY `idx_perf_history_user` (`user_id`),
  CONSTRAINT `perf_obj_history_ibfk_1` FOREIGN KEY (`obj_id`) REFERENCES `perf_objectives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `perf_obj_history_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=2529 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `perf_objectives`
-- -----------------------------------------------------
CREATE TABLE `perf_objectives` (
  `id` int NOT NULL AUTO_INCREMENT,
  `obj_name` varchar(500) NOT NULL,
  `obj_number` varchar(100) NOT NULL,
  `parent_obj_id` int DEFAULT NULL,
  `description` text NOT NULL,
  `time_line_id` int NOT NULL,
  `weightage` float DEFAULT NULL,
  `priority` enum('highest','high','medium','low','lowest') DEFAULT NULL,
  `obj_accepting_status` enum('accepted','in_review','request_for_revision') NOT NULL DEFAULT 'in_review',
  `obj_completion_status` enum('accepted','in_review','request_for_revision') DEFAULT NULL,
  `obj_board_status` enum('todo','in_progress','in_review','done') NOT NULL DEFAULT 'todo',
  `obj_progress` float NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `last_updated_by` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `obj_number` (`obj_number`),
  KEY `idx_perf_obj_timeline` (`time_line_id`),
  KEY `idx_perf_obj_parent` (`parent_obj_id`),
  KEY `idx_perf_obj_board_status` (`obj_board_status`),
  KEY `idx_perf_obj_is_active` (`is_active`),
  CONSTRAINT `perf_objectives_ibfk_1` FOREIGN KEY (`parent_obj_id`) REFERENCES `perf_objectives` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `perf_objectives_ibfk_2` FOREIGN KEY (`time_line_id`) REFERENCES `perf_time_lines` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=267 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `perf_time_lines`
-- -----------------------------------------------------
CREATE TABLE `perf_time_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quarter` enum('Q1','Q2','Q3','Q4') NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `year` int NOT NULL,
  `quarter_title` varchar(255) NOT NULL,
  `notes` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `last_updated_by` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_perf_quarter_year` (`quarter`,`year`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `personal_profiles`
-- -----------------------------------------------------
CREATE TABLE `personal_profiles` (
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `gender` enum('Male','Female','Not to specify') NOT NULL,
  `date_of_birth` date NOT NULL,
  `age` tinyint unsigned DEFAULT NULL,
  `nationality` varchar(100) NOT NULL,
  `personal_email` varchar(255) DEFAULT NULL,
  `phone_number` varchar(20) NOT NULL,
  `blood_group` varchar(5) DEFAULT NULL,
  `emergency_contact` varchar(20) DEFAULT NULL,
  `emergency_relationship` varchar(50) DEFAULT NULL,
  `about_me_pdf` varchar(2048) DEFAULT NULL,
  `about_me_video` varchar(2048) DEFAULT NULL,
  `profile_picture` varchar(2048) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `unique_personal_email` (`personal_email`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `post_reactions`
-- -----------------------------------------------------
CREATE TABLE `post_reactions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int unsigned NOT NULL COMMENT 'Reference to posts table',
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'User ID who reacted',
  `reaction` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Reaction emoji (?, ?, ?, ?, ?, ?)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_post_user_reaction` (`post_id`,`user_id`),
  KEY `idx_post_reactions_post_id` (`post_id`),
  KEY `idx_post_reactions_user_id` (`user_id`),
  CONSTRAINT `fk_post_reactions_post_id` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reactions to posts';

-- -----------------------------------------------------
-- Table `posts`
-- -----------------------------------------------------
CREATE TABLE `posts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'User ID who created the post',
  `msg` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Post message content',
  `file` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Optional file URL attachment',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_posts_user_id` (`user_id`),
  KEY `idx_posts_created_at` (`created_at`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Posts in My Teams social feed';

-- -----------------------------------------------------
-- Table `professional_profiles`
-- -----------------------------------------------------
CREATE TABLE `professional_profiles` (
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `employee_code` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `date_of_joining` date NOT NULL,
  `experience_years` tinyint unsigned NOT NULL,
  `department` varchar(100) NOT NULL,
  `sub_department` varchar(100) NOT NULL,
  `work_email` varchar(255) NOT NULL,
  `designation` varchar(100) NOT NULL,
  `reporting_manager` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `employment_status` enum('Pending','On Probation','Part Time','Freelancer','Confirmed','Contract','Intern','On Leave','Suspended','Relieved','Terminated','Absconding','Resigned','Retired') NOT NULL,
  `last_working_day` date DEFAULT NULL,
  `probation_period_days` smallint unsigned NOT NULL,
  `notice_during_probation` smallint unsigned NOT NULL,
  `notice_after_probation` smallint unsigned NOT NULL,
  `confirmation_date` date NOT NULL,
  `retirement_age` tinyint unsigned NOT NULL DEFAULT '56',
  `tenure_last_date` date NOT NULL,
  `ctc` decimal(15,2) DEFAULT NULL,
  `gross` decimal(15,2) DEFAULT NULL,
  `annual_salary` decimal(15,2) DEFAULT NULL,
  `monthly_salary` decimal(15,2) DEFAULT NULL,
  `general_plan_with_pf` tinyint(1) NOT NULL,
  `general_plan_without_pf` tinyint(1) NOT NULL,
  `role` enum('Admin','HR','Manager','Employee','SuperAdmin') NOT NULL,
  `timezone_id` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `work_email` (`work_email`),
  UNIQUE KEY `employee_code_2` (`employee_code`),
  UNIQUE KEY `work_email_2` (`work_email`),
  UNIQUE KEY `employee_code_3` (`employee_code`),
  UNIQUE KEY `work_email_3` (`work_email`),
  UNIQUE KEY `employee_code_4` (`employee_code`),
  UNIQUE KEY `work_email_4` (`work_email`),
  KEY `fk_prof_timezone_id` (`timezone_id`),
  CONSTRAINT `fk_prof_timezone_id` FOREIGN KEY (`timezone_id`) REFERENCES `time_zones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `professional_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `provision_approvers`
-- -----------------------------------------------------
CREATE TABLE `provision_approvers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `country` enum('Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Côte d''Ivoire','Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Holy See','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe') NOT NULL,
  `approvers` json NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `country` (`country`),
  UNIQUE KEY `provision_approvers_country` (`country`),
  UNIQUE KEY `country_2` (`country`),
  UNIQUE KEY `country_3` (`country`),
  KEY `provision_approvers_created_at` (`created_at`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `provision_requests`
-- -----------------------------------------------------
CREATE TABLE `provision_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `request_type` enum('Allotment','Change','Return/Revoke') NOT NULL,
  `asset` enum('Apple MacBook Laptop','Mobile','HP Laptop','Dell Laptop','Lenova Laptop') NOT NULL,
  `remark` varchar(1000) NOT NULL,
  `request_status` enum('Approved','Rejected','Pending','Cancelled') NOT NULL DEFAULT 'Pending',
  `approver` json NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `provision_requests_user_id` (`user_id`),
  KEY `provision_requests_request_status` (`request_status`),
  KEY `provision_requests_request_type` (`request_type`),
  KEY `provision_requests_asset` (`asset`),
  KEY `provision_requests_created_at` (`created_at`),
  CONSTRAINT `provision_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `professional_profiles` (`user_id`) ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `questions`
-- -----------------------------------------------------
CREATE TABLE `questions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `question` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Question text',
  `role` enum('Employee','Manager','CEO') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Target role for the question',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether the question is active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_questions_role` (`role`),
  KEY `idx_questions_is_active` (`is_active`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Questions for performance reviews';

-- -----------------------------------------------------
-- Table `sequelizemeta`
-- -----------------------------------------------------
CREATE TABLE `sequelizemeta` (
  `name` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

-- -----------------------------------------------------
-- Table `shifts`
-- -----------------------------------------------------
CREATE TABLE `shifts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `shift_name` varchar(255) NOT NULL,
  `shift_type` enum('morning','afternoon','evening','night','custom') NOT NULL,
  `working_days` json NOT NULL,
  `start_time` varchar(255) NOT NULL,
  `end_time` varchar(255) NOT NULL,
  `working_hours` float NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_shift_name` (`shift_name`),
  UNIQUE KEY `shift_name` (`shift_name`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `sub_objectives`
-- -----------------------------------------------------
CREATE TABLE `sub_objectives` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID of the user',
  `obj_id` int unsigned NOT NULL COMMENT 'Reference to objectives table',
  `sub_objective` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_results` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Key results for the sub objective',
  `file` text COLLATE utf8mb4_unicode_ci COMMENT 'File URL',
  `status` enum('Pending','InProgress','Completed','Rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending' COMMENT 'Status of the sub objective',
  `weightage` float DEFAULT NULL COMMENT 'Weightage value (0-100)',
  `is_approved` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Approval status',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sub_objectives_user_id` (`user_id`),
  KEY `idx_sub_objectives_obj_id` (`obj_id`),
  KEY `idx_sub_objectives_status` (`status`),
  CONSTRAINT `fk_sub_objectives_obj_id` FOREIGN KEY (`obj_id`) REFERENCES `objectives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_sub_objectives_weightage` CHECK (((`weightage` is null) or ((`weightage` >= 0) and (`weightage` <= 100))))
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=216 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sub objectives for individual users';

-- -----------------------------------------------------
-- Table `time_lines`
-- -----------------------------------------------------
CREATE TABLE `time_lines` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `year` int NOT NULL,
  `quarter` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_year_quarter` (`year`,`quarter`),
  CONSTRAINT `check_quarter_range` CHECK (((`quarter` >= 1) and (`quarter` <= 4))),
  CONSTRAINT `check_year_range` CHECK (((`year` >= 1900) and (`year` <= 9999)))
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------
-- Table `time_zones`
-- -----------------------------------------------------
CREATE TABLE `time_zones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `country_name` varchar(100) NOT NULL,
  `country_code` varchar(10) NOT NULL,
  `timezone` varchar(100) NOT NULL,
  `shift_timing_24` varchar(13) NOT NULL,
  `shift_timing_12` varchar(20) NOT NULL,
  `working_status` enum('Working Hours','Off Hours','After Hours') NOT NULL DEFAULT 'Off Hours',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_timezone` (`timezone`),
  KEY `time_zones_country` (`country_name`),
  KEY `time_zones_working_status` (`working_status`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `wfh_approval_steps`
-- -----------------------------------------------------
CREATE TABLE `wfh_approval_steps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wfh_request_id` int NOT NULL,
  `step_number` int NOT NULL,
  `approver_user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `approver_employee_id` varchar(255) NOT NULL,
  `action` enum('Pending','Approved','Rejected','Delegated') NOT NULL DEFAULT 'Pending',
  `comments` text,
  `action_timestamp` datetime DEFAULT NULL,
  `delegated_to_user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL,
  `delegated_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_wfh_request_step` (`wfh_request_id`,`step_number`),
  KEY `wfh_approval_steps_approver_user_id` (`approver_user_id`),
  KEY `wfh_approval_steps_action` (`action`),
  KEY `delegated_to_user_id` (`delegated_to_user_id`),
  CONSTRAINT `wfh_approval_steps_ibfk_10` FOREIGN KEY (`wfh_request_id`) REFERENCES `wfh_requests` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `wfh_approval_steps_ibfk_11` FOREIGN KEY (`approver_user_id`) REFERENCES `personal_profiles` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `wfh_approval_steps_ibfk_12` FOREIGN KEY (`delegated_to_user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `wfh_policies`
-- -----------------------------------------------------
CREATE TABLE `wfh_policies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `policy_name` varchar(150) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `max_wfh_per_frequency` int DEFAULT NULL,
  `frequency_type` enum('Daily','Weekly','Monthly','Unlimited') NOT NULL,
  `allow_consecutive_wfh_days` tinyint(1) NOT NULL DEFAULT '1',
  `max_consecutive_wfh_days` int DEFAULT NULL,
  `requires_approval` tinyint(1) NOT NULL DEFAULT '1',
  `advance_notice_required` enum('SameDay','1Day','2Days','3Days','1Week') NOT NULL DEFAULT '1Day',
  `allow_emergency_wfh` tinyint(1) NOT NULL DEFAULT '0',
  `blackout_dates_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `team_strength_check_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `min_team_strength_percentage` float DEFAULT NULL,
  `requires_justification` tinyint(1) NOT NULL DEFAULT '1',
  `min_justification_length` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `policy_name` (`policy_name`),
  UNIQUE KEY `wfh_policies_policy_name` (`policy_name`),
  UNIQUE KEY `policy_name_2` (`policy_name`),
  UNIQUE KEY `policy_name_3` (`policy_name`),
  UNIQUE KEY `policy_name_4` (`policy_name`)
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `wfh_policy_assignment_rules`
-- -----------------------------------------------------
CREATE TABLE `wfh_policy_assignment_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(150) NOT NULL,
  `policy_id` int NOT NULL,
  `priority` int NOT NULL DEFAULT '100',
  `applicable_region` json DEFAULT NULL,
  `applicable_department` json DEFAULT NULL,
  `applicable_employment_type` json DEFAULT NULL,
  `applicable_user_id` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rule_name` (`rule_name`),
  UNIQUE KEY `wfh_policy_assignment_rules_rule_name` (`rule_name`),
  UNIQUE KEY `rule_name_2` (`rule_name`),
  UNIQUE KEY `rule_name_3` (`rule_name`),
  UNIQUE KEY `rule_name_4` (`rule_name`),
  KEY `wfh_policy_assignment_rules_policy_id` (`policy_id`),
  KEY `wfh_policy_assignment_rules_priority` (`priority`),
  CONSTRAINT `wfh_policy_assignment_rules_ibfk_1` FOREIGN KEY (`policy_id`) REFERENCES `wfh_policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `wfh_policy_restrictions`
-- -----------------------------------------------------
CREATE TABLE `wfh_policy_restrictions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `policy_id` int NOT NULL,
  `restriction_type` enum('BlackoutDate','DayOfWeek','SpecificDate','DateRange') NOT NULL,
  `restriction_name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `specific_date` date DEFAULT NULL,
  `date_range_start` date DEFAULT NULL,
  `date_range_end` date DEFAULT NULL,
  `restricted_days` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `applies_to_emergency_requests` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `wfh_policy_restrictions_policy_id` (`policy_id`),
  KEY `wfh_policy_restrictions_restriction_type` (`restriction_type`),
  KEY `wfh_policy_restrictions_is_active` (`is_active`),
  CONSTRAINT `wfh_policy_restrictions_ibfk_1` FOREIGN KEY (`policy_id`) REFERENCES `wfh_policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `wfh_requests`
-- -----------------------------------------------------
CREATE TABLE `wfh_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `policy_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `wfh_duration_type` enum('FullDay','FirstHalf','SecondHalf') NOT NULL,
  `number_of_days` float NOT NULL,
  `justification` text NOT NULL,
  `work_plan` text,
  `status` enum('Pending','Approved','Rejected','Cancelled','AutoApproved') NOT NULL DEFAULT 'Pending',
  `request_timestamp` datetime NOT NULL,
  `approval_workflow_id` int DEFAULT NULL,
  `current_approver_step` int DEFAULT NULL,
  `is_emergency_request` tinyint(1) NOT NULL DEFAULT '0',
  `manager_comments` text,
  `notify_user_ids` json DEFAULT NULL,
  `approved_by_user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_by_user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `wfh_requests_user_id` (`user_id`),
  KEY `wfh_requests_employee_id` (`employee_id`),
  KEY `wfh_requests_policy_id` (`policy_id`),
  KEY `wfh_requests_status` (`status`),
  KEY `wfh_requests_start_date_end_date` (`start_date`,`end_date`),
  KEY `approval_workflow_id` (`approval_workflow_id`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  KEY `rejected_by_user_id` (`rejected_by_user_id`),
  CONSTRAINT `wfh_requests_ibfk_10` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `wfh_requests_ibfk_11` FOREIGN KEY (`policy_id`) REFERENCES `wfh_policies` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `wfh_requests_ibfk_12` FOREIGN KEY (`approval_workflow_id`) REFERENCES `approval_workflows` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `wfh_requests_ibfk_13` FOREIGN KEY (`approved_by_user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `wfh_requests_ibfk_14` FOREIGN KEY (`rejected_by_user_id`) REFERENCES `personal_profiles` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -----------------------------------------------------
-- Table `wfh_usage_tracking`
-- -----------------------------------------------------
CREATE TABLE `wfh_usage_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` char(36) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `employee_id` varchar(255) NOT NULL,
  `policy_id` int NOT NULL,
  `tracking_period_start` date NOT NULL,
  `tracking_period_end` date NOT NULL,
  `total_wfh_days_used` float NOT NULL DEFAULT '0',
  `consecutive_wfh_days_current` int NOT NULL DEFAULT '0',
  `last_wfh_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_policy_period` (`user_id`,`policy_id`,`tracking_period_start`),
  KEY `wfh_usage_tracking_employee_id` (`employee_id`),
  KEY `wfh_usage_tracking_policy_id` (`policy_id`),
  CONSTRAINT `wfh_usage_tracking_ibfk_7` FOREIGN KEY (`user_id`) REFERENCES `personal_profiles` (`user_id`) ON UPDATE CASCADE,
  CONSTRAINT `wfh_usage_tracking_ibfk_8` FOREIGN KEY (`policy_id`) REFERENCES `wfh_policies` (`id`) ON UPDATE CASCADE
) /*!50100 TABLESPACE `innodb_system` */ ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

