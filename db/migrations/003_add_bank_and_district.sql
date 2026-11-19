-- ==============================================================================
-- Миграция 003: Добавление берега (bank) и района (district)
-- для образовательных учреждений и спортивных площадок
-- ==============================================================================

-- 1. Добавление колонок в таблицу образовательных учреждений
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS bank VARCHAR(10) CHECK (bank IN ('left', 'right')),
ADD COLUMN IF NOT EXISTS district VARCHAR(100);

COMMENT ON COLUMN organizations.bank IS 'Берег расположения учреждения: left (левый) или right (правый)';
COMMENT ON COLUMN organizations.district IS 'Административный район города Новосибирска';

-- 2. Добавление колонок в таблицу спортивных площадок
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS bank VARCHAR(10) CHECK (bank IN ('left', 'right')),
ADD COLUMN IF NOT EXISTS district VARCHAR(100);

COMMENT ON COLUMN venues.bank IS 'Берег расположения площадки: left (левый) или right (правый)';
COMMENT ON COLUMN venues.district IS 'Административный район города Новосибирска';

-- 3. Создание индексов для быстрой фильтрации по берегу и району
CREATE INDEX IF NOT EXISTS idx_venues_bank ON venues(bank);
CREATE INDEX IF NOT EXISTS idx_venues_district ON venues(district);
CREATE INDEX IF NOT EXISTS idx_organizations_bank ON organizations(bank);
CREATE INDEX IF NOT EXISTS idx_organizations_district ON organizations(district);
