-- Di trú mã phong cách cũ (tiếng Trung) sang mã mới (tiếng Anh lowercase).
-- Cột style/visual_style vẫn là VARCHAR; bản đồ giá trị khớp
-- backend/app/models/types.py (ProjectStyle / ProjectVisualStyle).
-- Idempotent: WHERE/CASE chỉ chạm các dòng còn mã cũ, chạy lại an toàn.
BEGIN;
SET NAMES utf8mb4;

-- Mỗi bảng một UPDATE (style + visual_style) với CASE, idempotent.

UPDATE projects SET
  style = CASE style
    WHEN '真人都市' THEN 'real_people_city'
    WHEN '真人科幻' THEN 'real_people_scifi'
    WHEN '真人古装' THEN 'real_people_ancient'
    WHEN '动漫科幻' THEN 'anime_scifi'
    WHEN '动漫3D'   THEN 'anime_3d'
    WHEN '国漫'     THEN 'guoman'
    WHEN '水墨画'   THEN 'ink_wash'
    ELSE style END,
  visual_style = CASE visual_style
    WHEN '现实' THEN 'live_action'
    WHEN '动漫' THEN 'anime'
    ELSE visual_style END;

UPDATE scenes SET
  style = CASE style
    WHEN '真人都市' THEN 'real_people_city'
    WHEN '真人科幻' THEN 'real_people_scifi'
    WHEN '真人古装' THEN 'real_people_ancient'
    WHEN '动漫科幻' THEN 'anime_scifi'
    WHEN '动漫3D'   THEN 'anime_3d'
    WHEN '国漫'     THEN 'guoman'
    WHEN '水墨画'   THEN 'ink_wash'
    ELSE style END,
  visual_style = CASE visual_style
    WHEN '现实' THEN 'live_action'
    WHEN '动漫' THEN 'anime'
    ELSE visual_style END;

UPDATE props SET
  style = CASE style
    WHEN '真人都市' THEN 'real_people_city'
    WHEN '真人科幻' THEN 'real_people_scifi'
    WHEN '真人古装' THEN 'real_people_ancient'
    WHEN '动漫科幻' THEN 'anime_scifi'
    WHEN '动漫3D'   THEN 'anime_3d'
    WHEN '国漫'     THEN 'guoman'
    WHEN '水墨画'   THEN 'ink_wash'
    ELSE style END,
  visual_style = CASE visual_style
    WHEN '现实' THEN 'live_action'
    WHEN '动漫' THEN 'anime'
    ELSE visual_style END;

UPDATE costumes SET
  style = CASE style
    WHEN '真人都市' THEN 'real_people_city'
    WHEN '真人科幻' THEN 'real_people_scifi'
    WHEN '真人古装' THEN 'real_people_ancient'
    WHEN '动漫科幻' THEN 'anime_scifi'
    WHEN '动漫3D'   THEN 'anime_3d'
    WHEN '国漫'     THEN 'guoman'
    WHEN '水墨画'   THEN 'ink_wash'
    ELSE style END,
  visual_style = CASE visual_style
    WHEN '现实' THEN 'live_action'
    WHEN '动漫' THEN 'anime'
    ELSE visual_style END;

UPDATE actors SET
  style = CASE style
    WHEN '真人都市' THEN 'real_people_city'
    WHEN '真人科幻' THEN 'real_people_scifi'
    WHEN '真人古装' THEN 'real_people_ancient'
    WHEN '动漫科幻' THEN 'anime_scifi'
    WHEN '动漫3D'   THEN 'anime_3d'
    WHEN '国漫'     THEN 'guoman'
    WHEN '水墨画'   THEN 'ink_wash'
    ELSE style END,
  visual_style = CASE visual_style
    WHEN '现实' THEN 'live_action'
    WHEN '动漫' THEN 'anime'
    ELSE visual_style END;

-- Xác nhận: không còn mã cũ trong 5 bảng
SELECT
  'projects' AS tbl, COUNT(*) AS legacy_left FROM projects WHERE style IN ('真人都市','真人科幻','真人古装','动漫科幻','动漫3D','国漫','水墨画') OR visual_style IN ('现实','动漫')
UNION ALL SELECT 'scenes', COUNT(*) FROM scenes WHERE style IN ('真人都市','真人科幻','真人古装','动漫科幻','动漫3D','国漫','水墨画') OR visual_style IN ('现实','动漫')
UNION ALL SELECT 'props', COUNT(*) FROM props WHERE style IN ('真人都市','真人科幻','真人古装','动漫科幻','动漫3D','国漫','水墨画') OR visual_style IN ('现实','动漫')
UNION ALL SELECT 'costumes', COUNT(*) FROM costumes WHERE style IN ('真人都市','真人科幻','真人古装','动漫科幻','动漫3D','国漫','水墨画') OR visual_style IN ('现实','动漫')
UNION ALL SELECT 'actors', COUNT(*) FROM actors WHERE style IN ('真人都市','真人科幻','真人古装','动漫科幻','动漫3D','国漫','水墨画') OR visual_style IN ('现实','动漫');

COMMIT;
