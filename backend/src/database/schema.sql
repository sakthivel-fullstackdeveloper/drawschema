-- Database Schema Designer - MySQL Schema Definition

CREATE DATABASE IF NOT EXISTS db_schema_designer;
USE db_schema_designer;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tables Table
CREATE TABLE IF NOT EXISTS tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  x DOUBLE NOT NULL DEFAULT 0,
  y DOUBLE NOT NULL DEFAULT 0,
  width DOUBLE NOT NULL DEFAULT 220,
  height DOUBLE NOT NULL DEFAULT 200,
  color VARCHAR(50) NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_table (project_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Columns Table
CREATE TABLE IF NOT EXISTS columns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  datatype VARCHAR(50) NOT NULL,
  length VARCHAR(50) DEFAULT NULL,
  nullable BOOLEAN NOT NULL DEFAULT TRUE,
  primary_key BOOLEAN NOT NULL DEFAULT FALSE,
  foreign_key BOOLEAN NOT NULL DEFAULT FALSE,
  unique_key BOOLEAN NOT NULL DEFAULT FALSE,
  auto_increment BOOLEAN NOT NULL DEFAULT FALSE,
  default_value VARCHAR(255) DEFAULT NULL,
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE,
  UNIQUE KEY unique_table_column (table_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relationships Table
CREATE TABLE IF NOT EXISTS relationships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  from_table_id INT NOT NULL,
  from_column_id INT NOT NULL,
  to_table_id INT NOT NULL,
  to_column_id INT NOT NULL,
  relation_type VARCHAR(50) NOT NULL, -- 'OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'
  on_delete VARCHAR(50) NOT NULL DEFAULT 'CASCADE', -- 'CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'
  on_update VARCHAR(50) NOT NULL DEFAULT 'CASCADE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (from_table_id) REFERENCES tables(id) ON DELETE CASCADE,
  FOREIGN KEY (from_column_id) REFERENCES columns(id) ON DELETE CASCADE,
  FOREIGN KEY (to_table_id) REFERENCES tables(id) ON DELETE CASCADE,
  FOREIGN KEY (to_column_id) REFERENCES columns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project Versions Table
CREATE TABLE IF NOT EXISTS project_versions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  version_number INT NOT NULL,
  version_name VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  snapshot_json LONGTEXT NOT NULL,
  is_compressed BOOLEAN DEFAULT TRUE,
  schema_version VARCHAR(50) DEFAULT '1.0',
  tables_count INT DEFAULT 0,
  relationships_count INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_auto_save BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_version (project_id, version_number),
  INDEX idx_project_version_pinned (project_id, is_pinned),
  INDEX idx_version_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
