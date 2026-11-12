-- ==============================================================================
-- Миграция 001: Инициализация схемы БД курсового проекта
-- "Кроссплатформенное приложение для бронирования муниципальных спортивных площадок"
-- ==============================================================================

-- 1. Подключение расширения для поддержки EXCLUDE с обычными типами (INT + TSTZRANGE)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Таблица ролей пользователей
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

COMMENT ON TABLE roles IS 'Справочник системных ролей пользователей';
COMMENT ON COLUMN roles.id IS 'Уникальный идентификатор роли';
COMMENT ON COLUMN roles.name IS 'Системное наименование роли (teacher, school_admin, venue_manager, admin)';
COMMENT ON COLUMN roles.description IS 'Описание прав и назначения роли';

-- 3. Таблица образовательных учреждений (организаций)
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'Образовательные учреждения (школы, лицеи, гимназии, спортшколы)';
COMMENT ON COLUMN organizations.id IS 'Уникальный идентификатор учреждения';
COMMENT ON COLUMN organizations.name IS 'Полное наименование образовательного учреждения';
COMMENT ON COLUMN organizations.address IS 'Юридический и фактический адрес';
COMMENT ON COLUMN organizations.phone IS 'Контактный номер телефона';
COMMENT ON COLUMN organizations.email IS 'Контактный email адрес';
COMMENT ON COLUMN organizations.created_at IS 'Дата и время добавления в систему';

-- 4. Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    organization_id INT REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Учетные записи пользователей системы (учителя, тренеры, администраторы)';
COMMENT ON COLUMN users.id IS 'Уникальный идентификатор пользователя';
COMMENT ON COLUMN users.email IS 'Электронная почта (логин для авторизации)';
COMMENT ON COLUMN users.password_hash IS 'Хэш пароля (алгоритм bcrypt)';
COMMENT ON COLUMN users.full_name IS 'ФИО пользователя';
COMMENT ON COLUMN users.phone IS 'Контактный телефон';
COMMENT ON COLUMN users.role_id IS 'Идентификатор роли пользователя';
COMMENT ON COLUMN users.organization_id IS 'Идентификатор образовательного учреждения';
COMMENT ON COLUMN users.created_at IS 'Дата и время регистрации';

-- 5. Справочник видов спорта
CREATE TABLE IF NOT EXISTS sport_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

COMMENT ON TABLE sport_types IS 'Справочник видов спорта и профилей площадок';
COMMENT ON COLUMN sport_types.id IS 'Уникальный идентификатор вида спорта';
COMMENT ON COLUMN sport_types.name IS 'Название вида спорта (футбол, баскетбол, волейбол и т.д.)';
COMMENT ON COLUMN sport_types.description IS 'Описание специфики и требований';

-- 6. Таблица спортивных площадок
CREATE TABLE IF NOT EXISTS venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    sport_type_id INT NOT NULL REFERENCES sport_types(id) ON DELETE RESTRICT,
    dimensions VARCHAR(100),
    surface_type VARCHAR(100),
    has_lighting BOOLEAN NOT NULL DEFAULT FALSE,
    has_fence BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE venues IS 'Муниципальные спортивные площадки';
COMMENT ON COLUMN venues.id IS 'Уникальный идентификатор площадки';
COMMENT ON COLUMN venues.name IS 'Название спортивной площадки или стадиона';
COMMENT ON COLUMN venues.address IS 'Адрес местонахождения площадки';
COMMENT ON COLUMN venues.latitude IS 'Географическая широта для отображения на карте (WGS 84)';
COMMENT ON COLUMN venues.longitude IS 'Географическая долгота для отображения на карте (WGS 84)';
COMMENT ON COLUMN venues.sport_type_id IS 'Основной профильный вид спорта';
COMMENT ON COLUMN venues.dimensions IS 'Габариты площадки в метрах (например, 40x20 м)';
COMMENT ON COLUMN venues.surface_type IS 'Тип покрытия (искусственный газон, резиновая крошка, паркет, асфальт)';
COMMENT ON COLUMN venues.has_lighting IS 'Наличие искусственного освещения для вечерних занятий';
COMMENT ON COLUMN venues.has_fence IS 'Наличие защитного ограждения периметра';
COMMENT ON COLUMN venues.description IS 'Подробное описание и правила пользования';
COMMENT ON COLUMN venues.is_active IS 'Флаг доступности площадки для бронирования';
COMMENT ON COLUMN venues.created_at IS 'Дата добавления площадки в каталог';

-- 7. Таблица инвентаря и оборудования площадки
CREATE TABLE IF NOT EXISTS venue_equipment (
    id SERIAL PRIMARY KEY,
    venue_id INT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    condition VARCHAR(100) DEFAULT 'Хорошее'
);

COMMENT ON TABLE venue_equipment IS 'Спортивный инвентарь и стационарное оборудование на площадке';
COMMENT ON COLUMN venue_equipment.id IS 'Идентификатор единицы оборудования';
COMMENT ON COLUMN venue_equipment.venue_id IS 'Идентификатор площадки';
COMMENT ON COLUMN venue_equipment.name IS 'Наименование оборудования (ворота, баскетбольные щиты, сетка)';
COMMENT ON COLUMN venue_equipment.quantity IS 'Количество единиц оборудования';
COMMENT ON COLUMN venue_equipment.condition IS 'Техническое состояние оборудования';

-- 8. Таблица фотографий площадок
CREATE TABLE IF NOT EXISTS venue_photos (
    id SERIAL PRIMARY KEY,
    venue_id INT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

COMMENT ON TABLE venue_photos IS 'Галерея фотографий спортивных площадок';
COMMENT ON COLUMN venue_photos.id IS 'Идентификатор фотографии';
COMMENT ON COLUMN venue_photos.venue_id IS 'Идентификатор площадки';
COMMENT ON COLUMN venue_photos.photo_url IS 'URL-ссылка или путь к файлу фотографии';
COMMENT ON COLUMN venue_photos.sort_order IS 'Порядок отображения в галерее';

-- 9. Таблица бронирований спортивных площадок
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    venue_id INT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id INT REFERENCES organizations(id) ON DELETE SET NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    purpose TEXT,
    participants_count INT NOT NULL CHECK (participants_count > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_booking_dates CHECK (end_at > start_at),
    -- Ограничение на уровне БД: запрет пересечений броней одной площадки (кроме отмененных)
    CONSTRAINT ex_booking_no_overlap EXCLUDE USING gist (
        venue_id WITH =,
        tstzrange(start_at, end_at) WITH &&
    ) WHERE (status != 'cancelled')
);

COMMENT ON TABLE bookings IS 'Заявки и подтвержденные бронирования спортивных площадок';
COMMENT ON COLUMN bookings.id IS 'Уникальный номер бронирования';
COMMENT ON COLUMN bookings.venue_id IS 'Идентификатор бронируемой площадки';
COMMENT ON COLUMN bookings.user_id IS 'Идентификатор пользователя, создавшего бронь';
COMMENT ON COLUMN bookings.organization_id IS 'Образовательное учреждение, от лица которого сделана бронь';
COMMENT ON COLUMN bookings.start_at IS 'Дата и время начала бронирования';
COMMENT ON COLUMN bookings.end_at IS 'Дата и время окончания бронирования';
COMMENT ON COLUMN bookings.purpose IS 'Цель проведения (урок физкультуры, школьный турнир, секция)';
COMMENT ON COLUMN bookings.participants_count IS 'Планируемое количество участников';
COMMENT ON COLUMN bookings.status IS 'Статус брони (pending - на рассмотрении, confirmed - подтверждено, cancelled - отменено)';
COMMENT ON COLUMN bookings.created_at IS 'Время формирования заявки';

-- 10. Таблица блокировок площадок (ремонт, погода, городские мероприятия)
CREATE TABLE IF NOT EXISTS venue_blocks (
    id SERIAL PRIMARY KEY,
    venue_id INT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_block_dates CHECK (end_at > start_at),
    -- Запрет пересечения периодов блокировок одной и той же площадки
    CONSTRAINT ex_block_no_overlap EXCLUDE USING gist (
        venue_id WITH =,
        tstzrange(start_at, end_at) WITH &&
    )
);

COMMENT ON TABLE venue_blocks IS 'Периоды недоступности площадок (ремонт, техобслуживание, соревнования)';
COMMENT ON COLUMN venue_blocks.id IS 'Идентификатор периода блокировки';
COMMENT ON COLUMN venue_blocks.venue_id IS 'Идентификатор блокируемой площадки';
COMMENT ON COLUMN venue_blocks.start_at IS 'Дата и время начала блокировки';
COMMENT ON COLUMN venue_blocks.end_at IS 'Дата и время окончания блокировки';
COMMENT ON COLUMN venue_blocks.reason IS 'Причина блокировки (ремонт, непогода, муниципальное мероприятие)';
COMMENT ON COLUMN venue_blocks.note IS 'Дополнительные примечания';
COMMENT ON COLUMN venue_blocks.created_at IS 'Дата внесения записи о блокировке';

-- 11. Триггер проверки пересечений: Бронирование не должно накладываться на блокировку площадки
CREATE OR REPLACE FUNCTION trg_check_booking_block_conflict()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != 'cancelled' THEN
        IF EXISTS (
            SELECT 1 FROM venue_blocks
            WHERE venue_id = NEW.venue_id
              AND tstzrange(start_at, end_at) && tstzrange(NEW.start_at, NEW.end_at)
        ) THEN
            RAISE EXCEPTION 'Площадка заблокирована на указанный период (ремонтные работы или техническое обслуживание)'
                USING ERRCODE = '23P01';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_block_conflict ON bookings;
CREATE TRIGGER trg_booking_block_conflict
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trg_check_booking_block_conflict();

-- 12. Триггер проверки пересечений: Блокировка не может быть установлена на уже забронированное время
CREATE OR REPLACE FUNCTION trg_check_block_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE venue_id = NEW.venue_id
          AND status != 'cancelled'
          AND tstzrange(start_at, end_at) && tstzrange(NEW.start_at, NEW.end_at)
    ) THEN
        RAISE EXCEPTION 'Невозможно заблокировать площадку: на указанный период уже есть активные бронирования'
            USING ERRCODE = '23P01';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_booking_conflict ON venue_blocks;
CREATE TRIGGER trg_block_booking_conflict
BEFORE INSERT OR UPDATE ON venue_blocks
FOR EACH ROW
EXECUTE FUNCTION trg_check_block_booking_conflict();

-- 13. Индексы для ускорения выборок и контроля связей
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_venues_sport_type_id ON venues(sport_type_id);
CREATE INDEX IF NOT EXISTS idx_venue_equipment_venue_id ON venue_equipment(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_photos_venue_id ON venue_photos(venue_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_organization_id ON bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_start ON bookings(venue_id, start_at);
CREATE INDEX IF NOT EXISTS idx_venue_blocks_venue_start ON venue_blocks(venue_id, start_at);

-- Выдача прав и передача владения объектами пользователю приложения
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sport_booking_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sport_booking_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO sport_booking_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sport_booking_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO sport_booking_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO sport_booking_user;

DO $$
DECLARE
    tbl RECORD;
    seq RECORD;
BEGIN
    FOR tbl IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO sport_booking_user;', tbl.tablename);
    END LOOP;
    FOR seq IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE format('ALTER SEQUENCE public.%I OWNER TO sport_booking_user;', seq.sequence_name);
    END LOOP;
END $$;
