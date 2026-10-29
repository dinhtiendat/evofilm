-- tính lại các shots.status='generating' lịch sử về trạng thái tĩnh.
-- Giải thích:
-- 1. Trong logic mới, shot.status chỉ biểu thị "trạng thái xác nhận trích xuất thông tin": pending / ready
-- 2. Các tác vụ tạo đang chạy phải được tập hợp động từ GenerationTask / GenerationTaskLink, không còn ghi vào shots.status
-- 3. bảng ứng viên thoại có thể chưa được tạo trong một số môi trường, do đó xử lý "có mới tham gia tính lại"

SET @has_dialogue_candidates_table = (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'shot_extracted_dialogue_candidates'
);

SET @normalize_shot_status_sql = IF(
    @has_dialogue_candidates_table > 0,
    "
    UPDATE shots AS s
    LEFT JOIN (
        SELECT
            shot_id,
            COUNT(*) AS total_count,
            SUM(CASE WHEN candidate_status = 'pending' THEN 1 ELSE 0 END) AS pending_count
        FROM shot_extracted_candidates
        GROUP BY shot_id
    ) AS ac
        ON ac.shot_id = s.id
    LEFT JOIN (
        SELECT
            shot_id,
            COUNT(*) AS total_count,
            SUM(CASE WHEN candidate_status = 'pending' THEN 1 ELSE 0 END) AS pending_count
        FROM shot_extracted_dialogue_candidates
        GROUP BY shot_id
    ) AS dc
        ON dc.shot_id = s.id
    SET s.status = CASE
        WHEN s.skip_extraction = 1 THEN 'ready'
        WHEN s.last_extracted_at IS NULL THEN 'pending'
        WHEN COALESCE(ac.total_count, 0) = 0 AND COALESCE(dc.total_count, 0) = 0 THEN 'ready'
        WHEN COALESCE(ac.pending_count, 0) = 0 AND COALESCE(dc.pending_count, 0) = 0 THEN 'ready'
        ELSE 'pending'
    END
    WHERE s.status = 'generating'
    ",
    "
    UPDATE shots AS s
    LEFT JOIN (
        SELECT
            shot_id,
            COUNT(*) AS total_count,
            SUM(CASE WHEN candidate_status = 'pending' THEN 1 ELSE 0 END) AS pending_count
        FROM shot_extracted_candidates
        GROUP BY shot_id
    ) AS ac
        ON ac.shot_id = s.id
    SET s.status = CASE
        WHEN s.skip_extraction = 1 THEN 'ready'
        WHEN s.last_extracted_at IS NULL THEN 'pending'
        WHEN COALESCE(ac.total_count, 0) = 0 THEN 'ready'
        WHEN COALESCE(ac.pending_count, 0) = 0 THEN 'ready'
        ELSE 'pending'
    END
    WHERE s.status = 'generating'
    "
);

PREPARE normalize_shot_status_stmt FROM @normalize_shot_status_sql;
EXECUTE normalize_shot_status_stmt;
DEALLOCATE PREPARE normalize_shot_status_stmt;
