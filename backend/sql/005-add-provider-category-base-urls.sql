SET @has_providers_image_base_url = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'providers'
    AND COLUMN_NAME = 'image_base_url'
);

SET @add_providers_image_base_url = IF(
  @has_providers_image_base_url = 0,
  "ALTER TABLE providers ADD COLUMN image_base_url VARCHAR(1024) NULL COMMENT 'Base URL API khả năng ảnh (phủ ghi tùy chọn)'",
  'SELECT 1'
);
PREPARE stmt_add_providers_image_base_url FROM @add_providers_image_base_url;
EXECUTE stmt_add_providers_image_base_url;
DEALLOCATE PREPARE stmt_add_providers_image_base_url;

SET @has_providers_video_base_url = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'providers'
    AND COLUMN_NAME = 'video_base_url'
);

SET @add_providers_video_base_url = IF(
  @has_providers_video_base_url = 0,
  "ALTER TABLE providers ADD COLUMN video_base_url VARCHAR(1024) NULL COMMENT 'Base URL API khả năng video (phủ ghi tùy chọn)'",
  'SELECT 1'
);
PREPARE stmt_add_providers_video_base_url FROM @add_providers_video_base_url;
EXECUTE stmt_add_providers_video_base_url;
DEALLOCATE PREPARE stmt_add_providers_video_base_url;
