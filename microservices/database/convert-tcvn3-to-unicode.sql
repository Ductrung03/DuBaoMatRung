-- Script convert TCVN3 to Unicode trong bảng laocai_ranhgioihc
-- Chạy trên database admin_db

\c admin_db

-- Function convert TCVN3 to Unicode
CREATE OR REPLACE FUNCTION convert_tcvn3_to_unicode(text)
RETURNS text AS $$
DECLARE
    result text;
BEGIN
    IF $1 IS NULL THEN
        RETURN NULL;
    END IF;

    result := $1;

    -- Chữ thường có dấu
    result := replace(result, E'\xB8', 'à');
    result := replace(result, E'\xB9', 'á');
    result := replace(result, E'\xBA', 'ả');
    result := replace(result, E'\xBB', 'ã');
    result := replace(result, E'\xBC', 'ạ');

    result := replace(result, E'\xC8', 'ằ');
    result := replace(result, E'\xC9', 'ắ');
    result := replace(result, E'\xCA', 'ẳ');
    result := replace(result, E'\xCB', 'ẵ');
    result := replace(result, E'\xCC', 'ặ');

    result := replace(result, E'\xE8', 'è');
    result := replace(result, E'\xE9', 'é');
    result := replace(result, E'\xEA', 'ẻ');
    result := replace(result, E'\xEB', 'ẽ');
    result := replace(result, E'\xEC', 'ẹ');

    result := replace(result, E'\xF2', 'ò');
    result := replace(result, E'\xF3', 'ó');
    result := replace(result, E'\xF4', 'ỏ');
    result := replace(result, E'\xF5', 'õ');
    result := replace(result, E'\xF6', 'ọ');

    result := replace(result, E'\xF9', 'ù');
    result := replace(result, E'\xFA', 'ú');
    result := replace(result, E'\xFB', 'ủ');
    result := replace(result, E'\xFC', 'ũ');
    result := replace(result, E'\xFD', 'ụ');

    result := replace(result, E'\xDD', 'ỳ');
    result := replace(result, E'\xDE', 'ý');
    result := replace(result, E'\xFF', 'ỷ');
    result := replace(result, E'\xEF', 'ỹ');

    -- Chữ hoa
    result := replace(result, E'\xB5', 'À');
    result := replace(result, E'\xB6', 'Ả');
    result := replace(result, E'\xB7', 'Ã');

    result := replace(result, E'\xC0', 'Ằ');
    result := replace(result, E'\xC1', 'Ắ');
    result := replace(result, E'\xC2', 'Ẳ');
    result := replace(result, E'\xC3', 'Ẵ');
    result := replace(result, E'\xC4', 'Ặ');

    result := replace(result, E'\xD0', 'È');
    result := replace(result, E'\xD1', 'É');
    result := replace(result, E'\xD2', 'Ẻ');
    result := replace(result, E'\xD3', 'Ẽ');
    result := replace(result, E'\xD4', 'Ẹ');

    result := replace(result, E'\xD8', 'Ì');
    result := replace(result, E'\xD9', 'Í');
    result := replace(result, E'\xDA', 'Ỉ');
    result := replace(result, E'\xDB', 'Ĩ');
    result := replace(result, E'\xDC', 'Ị');

    result := replace(result, E'\xD5', 'Õ');
    result := replace(result, E'\xD6', 'Ọ');

    -- Ơ, Ư
    result := replace(result, E'\xA9', 'ơ');
    result := replace(result, E'\xAA', 'ờ');
    result := replace(result, E'\xAB', 'ớ');
    result := replace(result, E'\xAC', 'ở');
    result := replace(result, E'\xAD', 'ỡ');
    result := replace(result, E'\xAE', 'ợ');

    result := replace(result, E'\xA8', 'ư');
    result := replace(result, E'\xAC', 'ừ');
    result := replace(result, E'\xAD', 'ứ');
    result := replace(result, E'\xAE', 'ử');
    result := replace(result, E'\xAF', 'ữ');
    result := replace(result, E'\xB0', 'ự');

    -- Ă
    result := replace(result, E'\xB8', 'ă');

    -- Đ
    result := replace(result, E'\xAC', 'đ');
    result := replace(result, E'\x92', 'Đ');

    -- Â, Ê, Ô, Ơ, Ư (có dấu)
    result := replace(result, E'\xAC', 'ầ');
    result := replace(result, E'\xAD', 'ấ');
    result := replace(result, E'\xAE', 'ẩ');
    result := replace(result, E'\xAF', 'ẫ');
    result := replace(result, E'\xB0', 'ậ');

    result := replace(result, E'\xAA', 'ề');
    result := replace(result, E'\xAB', 'ế');
    result := replace(result, E'\xD5', 'ể');
    result := replace(result, E'\xF5', 'ễ');
    result := replace(result, E'\xED', 'ệ');

    -- Các trường hợp đặc biệt thường gặp
    result := replace(result, 'B¾c', 'Bắc');
    result := replace(result, 'Hµ', 'Hà');
    result := replace(result, 'T¶', 'Tả');
    result := replace(result, 'Lµo', 'Lào');
    result := replace(result, 'Phêi', 'Phời');
    result := replace(result, 'C¸i', 'Cai');
    result := replace(result, 'NhÊt', 'Nhất');
    result := replace(result, 'Thèng', 'Thống');

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backup bảng trước khi convert
CREATE TABLE IF NOT EXISTS laocai_ranhgioihc_backup AS
SELECT * FROM laocai_ranhgioihc LIMIT 0;

INSERT INTO laocai_ranhgioihc_backup
SELECT * FROM laocai_ranhgioihc
WHERE NOT EXISTS (SELECT 1 FROM laocai_ranhgioihc_backup LIMIT 1);

-- Convert dữ liệu
DO $$
DECLARE
    total_rows bigint;
    converted_rows bigint;
BEGIN
    -- Đếm tổng số rows
    SELECT COUNT(*) INTO total_rows FROM laocai_ranhgioihc;

    RAISE NOTICE 'Starting conversion for % rows...', total_rows;

    -- Update huyen và xa
    UPDATE laocai_ranhgioihc
    SET
        huyen = convert_tcvn3_to_unicode(huyen),
        xa = convert_tcvn3_to_unicode(xa);

    GET DIAGNOSTICS converted_rows = ROW_COUNT;

    RAISE NOTICE 'Converted % rows successfully!', converted_rows;
    RAISE NOTICE 'Backup saved to laocai_ranhgioihc_backup';
END $$;

-- Kiểm tra kết quả
SELECT
    'Original' as type,
    huyen, xa
FROM laocai_ranhgioihc_backup
LIMIT 5;

SELECT
    'Converted' as type,
    huyen, xa
FROM laocai_ranhgioihc
LIMIT 5;

-- Cleanup function (optional - có thể giữ lại để dùng sau)
-- DROP FUNCTION IF EXISTS convert_tcvn3_to_unicode(text);
