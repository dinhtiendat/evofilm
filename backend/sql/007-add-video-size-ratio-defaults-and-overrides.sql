SET @has_projects_default_video_ratio = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'default_video_ratio'
);

SET @add_projects_default_video_ratio = IF(
  @has_projects_default_video_ratio = 0,
  "ALTER TABLE projects ADD COLUMN default_video_ratio VARCHAR(16) NULL COMMENT 'Tỷ lệ video mặc định cấp dự án (được để trống; dùng khi phân cảnh không phủ ghi)'",
  'SELECT 1'
);
PREPARE stmt_add_projects_default_video_ratio FROM @add_projects_default_video_ratio;
EXECUTE stmt_add_projects_default_video_ratio;
DEALLOCATE PREPARE stmt_add_projects_default_video_ratio;

SET @has_shot_details_override_video_ratio = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'shot_details'
    AND COLUMN_NAME = 'override_video_ratio'
);

SET @add_shot_details_override_video_ratio = IF(
  @has_shot_details_override_video_ratio = 0,
  "ALTER TABLE shot_details ADD COLUMN override_video_ratio VARCHAR(16) NULL COMMENT 'Phủ ghi tỷ lệ video cấp phân cảnh (để trống nghĩa là kế thừa mặc định của dự án)'",
  'SELECT 1'
);
PREPARE stmt_add_shot_details_override_video_ratio FROM @add_shot_details_override_video_ratio;
EXECUTE stmt_add_shot_details_override_video_ratio;
DEALLOCATE PREPARE stmt_add_shot_details_override_video_ratio;
