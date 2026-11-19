-- Миграция 004: Добавление атрибутов авторства и типа для фотографий площадок
-- Поля для поддержки реальных иллюстративных фото со свободными лицензиями

ALTER TABLE venue_photos
  ADD COLUMN IF NOT EXISTS is_real BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS author TEXT,
  ADD COLUMN IF NOT EXISTS license TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN venue_photos.is_real IS 'Признак реального фото (true) или векторной схемы/заглушки (false)';
COMMENT ON COLUMN venue_photos.author IS 'Автор фотографии / правообладатель';
COMMENT ON COLUMN venue_photos.license IS 'Короткое название свободной лицензии (CC BY, CC BY-SA, CC0, Public Domain)';
COMMENT ON COLUMN venue_photos.license_url IS 'Ссылка на текст свободной лицензии';
COMMENT ON COLUMN venue_photos.source_url IS 'Ссылка на страницу первоисточника (например, Wikimedia Commons)';
COMMENT ON COLUMN venue_photos.title IS 'Оригинальное название файла или описание изображения';
