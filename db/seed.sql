-- ==============================================================================
-- Полное сидирование базы данных SportBook
-- ==============================================================================

-- Очистка таблиц перед сидированием
TRUNCATE TABLE venue_blocks, bookings, venue_photos, venue_equipment, venues, sport_types, users, organizations, roles RESTART IDENTITY CASCADE;

-- 1. Системные роли пользователей
INSERT INTO roles (id, name, description) VALUES
(1, 'teacher', 'Учитель физической культуры или тренер образовательного учреждения. Бронирует площадки под занятия и секции.'),
(2, 'school_admin', 'Представитель администрации школы (директор, завуч). Координирует график школьных мероприятий.'),
(3, 'venue_manager', 'Управляющий муниципальными спортивными объектами. Подтверждает брони и отмечает периоды ремонта.'),
(4, 'admin', 'Главный администратор системы с полным доступом к управлению.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- 2. Виды спорта (5 утвержденных видов)
INSERT INTO sport_types (id, name, description) VALUES
(1, 'Футбол', 'Футбольные и мини-футбольные поля с искусственным или натуральным газоном'),
(2, 'Баскетбол', 'Баскетбольные площадки с полиуретановым амортизирующим покрытием и щитами'),
(3, 'Волейбол', 'Волейбольные корты со спортивным покрытием и регулируемой сеткой'),
(4, 'Универсальная площадка', 'Многофункциональные спортивные коробки для футбола, баскетбола и волейбола'),
(5, 'Легкая атлетика', 'Легкоатлетические стадионы, беговые дорожки, секторы для прыжков и общефизической подготовки')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

SELECT setval('sport_types_id_seq', (SELECT MAX(id) FROM sport_types));

-- 3. Образовательные учреждения (10 ОУ: 3 на левом берегу, 7 на правом берегу)
INSERT INTO organizations (id, name, address, district, bank, phone, email) VALUES
-- Левый берег (3 учреждения)
(1, 'МБОУ СОШ № 175', 'г. Новосибирск, ул. Титова, 43/1', 'Ленинский', 'left', '+7 (383) 351-12-30', 'school175@nsk-edu.ru'),
(2, 'МАОУ Лицей № 176', 'г. Новосибирск, ул. Зорге, 47', 'Кировский', 'left', '+7 (383) 342-88-10', 'lic176@nsk-edu.ru'),
(3, 'МБОУ Гимназия № 3', 'г. Новосибирск, ул. Детский проезд, 10', 'Советский', 'left', '+7 (383) 330-24-50', 'gimn3@nsk-edu.ru'),

-- Правый берег (7 учреждений)
(4, 'МАОУ Лицей № 22 "Надежда Сибири"', 'г. Новосибирск, ул. Советская, 63', 'Центральный', 'right', '+7 (383) 222-15-50', 'lic22@nsk-edu.ru'),
(5, 'МБОУ Гимназия № 1', 'г. Новосибирск, ул. Красный проспект, 48', 'Центральный', 'right', '+7 (383) 223-45-67', 'gimn1@nsk-edu.ru'),
(6, 'МБОУ СОШ № 54', 'г. Новосибирск, ул. Крылова, 18', 'Центральный', 'right', '+7 (383) 224-88-90', 'school54@nsk-edu.ru'),
(7, 'МАОУ Вторая Новосибирская Гимназия', 'г. Новосибирск, ул. Владимировская, 15', 'Железнодорожный', 'right', '+7 (383) 220-41-20', 'gimn2@nsk-edu.ru'),
(8, 'МБОУ Лицей № 126', 'г. Новосибирск, ул. Народная, 33', 'Калининский', 'right', '+7 (383) 276-02-15', 'lic126@nsk-edu.ru'),
(9, 'МБОУ СОШ № 153', 'г. Новосибирск, ул. Селезнева, 92', 'Дзержинский', 'right', '+7 (383) 211-34-60', 'school153@nsk-edu.ru'),
(10, 'МБОУ Гимназия № 9', 'г. Новосибирск, ул. Калинина, 255', 'Заельцовский', 'right', '+7 (383) 225-70-14', 'gimn9@nsk-edu.ru')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, bank = EXCLUDED.bank, district = EXCLUDED.district;

SELECT setval('organizations_id_seq', (SELECT MAX(id) FROM organizations));

-- 4. Пользователи (пароль для всех: password123, хэш bcrypt)
INSERT INTO users (id, email, password_hash, full_name, phone, role_id, organization_id) VALUES
(1, 'teacher@school22.ru', '$2b$10$MbkirBuii4ZIKFAJoQNDaOQ2vy77xMBdAJN.5LWp2Z5UC/iPkLShC', 'Иванов Иван Иванович', '+7 (913) 111-22-33', 1, 4),
(2, 'admin@school1.ru', '$2b$10$MbkirBuii4ZIKFAJoQNDaOQ2vy77xMBdAJN.5LWp2Z5UC/iPkLShC', 'Петрова Анна Сергеевна', '+7 (913) 222-33-44', 2, 5),
(3, 'manager@sportnsk.ru', '$2b$10$MbkirBuii4ZIKFAJoQNDaOQ2vy77xMBdAJN.5LWp2Z5UC/iPkLShC', 'Сидоров Алексей Дмитриевич', '+7 (913) 333-44-55', 3, NULL),
(4, 'sysadmin@booking.nsk.ru', '$2b$10$MbkirBuii4ZIKFAJoQNDaOQ2vy77xMBdAJN.5LWp2Z5UC/iPkLShC', 'Кузнецов Михаил Павлович', '+7 (913) 444-55-66', 4, NULL),
(5, 'coach@school175.ru', '$2b$10$MbkirBuii4ZIKFAJoQNDaOQ2vy77xMBdAJN.5LWp2Z5UC/iPkLShC', 'Смирнов Дмитрий Александрович', '+7 (913) 555-66-77', 1, 1)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 5. Спортивные площадки (30 площадок: 10 левый берег, 20 правый берег)
INSERT INTO venues (id, name, address, district, bank, latitude, longitude, sport_type_id, dimensions, surface_type, has_lighting, has_fence, description, is_active) VALUES
-- === ЛЕВЫЙ БЕРЕГ (10 площадок: по 2 каждого вида) ===
-- Футбол (левый берег)
(1, 'Стадион «Заря» (малое футбольное поле)', 'г. Новосибирск, ул. Спортивная, 2', 'Ленинский', 'left', 54.9870000, 82.8350000, 1, '60x40 м', 'Искусственный газон', true, true, 'Современное тренировочное футбольное поле с подогревом и искусственным газоном.', true),
(2, 'Футбольное поле СК «Фламинго»', 'г. Новосибирск, ул. Зорге, 82/1', 'Кировский', 'left', 54.9540000, 82.8980000, 1, '70x45 м', 'Искусственный газон', true, true, 'Открытая футбольная площадка в Кировском районе для районных школьных турниров.', true),

-- Баскетбол (левый берег)
(3, 'Баскетбольная арена ПКиО им. Кирова', 'г. Новосибирск, ул. Станиславского, 1а', 'Ленинский', 'left', 54.9830000, 82.8720000, 2, '28x15 м', 'Полиуретановое бесшовное', true, true, 'Уличная баскетбольная площадка в парковой зоне со стандартной разметкой.', true),
(4, 'Стритбольная площадка МЦ «Зодиак»', 'г. Новосибирск, ул. Немировича-Данченко, 138', 'Кировский', 'left', 54.9780000, 82.9050000, 2, '26x14 м', 'Резиновая крошка', true, true, 'Оборудованная площадка для стритбола и баскетбола 3х3.', true),

-- Волейбол (левый берег)
(5, 'Волейбольный корт «Наутилус»', 'г. Новосибирск, ул. Стартовая, 43', 'Ленинский', 'left', 54.9960000, 82.9210000, 3, '18x9 м', 'Спортивное резиновое', false, true, 'Открытый корт для классического волейбола с ограждением.', true),
(6, 'Волейбольная площадка Академгородка', 'г. Новосибирск, Морской проспект, 23', 'Советский', 'left', 54.8450000, 83.0920000, 3, '20x10 м', 'Резиновое покрытие', true, true, 'Спортивная волейбольная площадка в Верхней зоне Академгородка.', true),

-- Универсальная площадка (левый берег)
(7, 'Универсальная арена СОШ № 175', 'г. Новосибирск, ул. Титова, 43/1', 'Ленинский', 'left', 54.9810000, 82.8550000, 4, '40x20 м', 'Мастерфайбр', true, true, 'Многофункциональная коробка для мини-футбола, волейбола и баскетбола.', true),
(8, 'Спортивная площадка НГТУ', 'г. Новосибирск, пр. К. Маркса, 20', 'Ленинский', 'left', 54.9880000, 82.9040000, 4, '42x22 м', 'Тартан полимерный', true, true, 'Открытая арена для командных соревнований и школьных секций.', true),

-- Легкая атлетика (левый берег)
(9, 'Стадион «Сибсельмаш» (легкоатлетический сектор)', 'г. Новосибирск, ул. Пархоменко, 2а', 'Ленинский', 'left', 54.9910000, 82.8710000, 5, '400 м дорожки', 'Тартановое покрытие', true, true, 'Круговые беговые дорожки, прыжковая яма и зона общефизической подготовки.', true),
(10, 'Стадион им. Богатырева (беговые дорожки)', 'г. Новосибирск, ул. Ильича, 4', 'Советский', 'left', 54.8480000, 83.1040000, 5, '250 м дорожки', 'Спортивная резина', true, false, 'Легкоатлетический сектор с дорожками и сектором сдачи нормативов ГТО.', true),

-- === ПРАВЫЙ БЕРЕГ (20 площадок: по 4 каждого вида) ===
-- Футбол (правый берег)
(11, 'Стадион «Спартак» (тренировочное поле)', 'г. Новосибирск, ул. Мичурина, 10', 'Центральный', 'right', 55.0355000, 82.9230000, 1, '60x40 м', 'Искусственный газон 4G', true, true, 'Футбольная арена в самом центре Новосибирска с качественным искусственным покрытием.', true),
(12, 'Футбольное поле СШОР «Сибирь»', 'г. Новосибирск, ул. Богдана Хмельницкого, 23', 'Калининский', 'right', 55.0740000, 82.9560000, 1, '65x42 м', 'Искусственный газон', true, true, 'Футбольная площадка спортивной школы олимпийского резерва.', true),
(13, 'Стадион «Чкаловец» (футбольный сектор)', 'г. Новосибирск, ул. Республиканская, 12/1', 'Дзержинский', 'right', 55.0560000, 82.9810000, 1, '60x40 м', 'Газон искусственный', true, true, 'Спортивное поле для проведения школьных матчей и спартакиад.', true),
(14, 'Стадион «Электрон» (малое поле)', 'г. Новосибирск, ул. Учительская, 42', 'Калининский', 'right', 55.0820000, 82.9730000, 1, '50x35 м', 'Искусственный газон', true, true, 'Уютное футбольное поле с защитным ограждением и ночным освещением.', true),

-- Баскетбол (правый берег)
(15, 'Баскетбольная площадка Нарымского сквера', 'г. Новосибирск, ул. 1905 года, 85', 'Железнодорожный', 'right', 55.0440000, 82.9090000, 2, '28x15 м', 'Бесшовный полиуретан', true, true, 'Открытая баскетбольная арена с амортизирующими кольцами в парке.', true),
(16, 'Стритбол-парк Центрального парка', 'г. Новосибирск, ул. Мичурина, 8', 'Центральный', 'right', 55.0330000, 82.9280000, 2, '26x14 м', 'Резиновое покрытие', true, true, 'Популярная городская стритбольная площадка с хорошим освещением.', true),
(17, 'Баскетбольная площадка «Берёзовая роща»', 'г. Новосибирск, ул. Планетная, 53', 'Дзержинский', 'right', 55.0495000, 82.9550000, 2, '28x15 м', 'Мастерфайбр', false, true, 'Огражденная площадка для игры в баскетбол среди березового парка.', true),
(18, 'Баскетбольный корт СШОР «ЦИВС»', 'г. Новосибирск, ул. Сибирская, 54', 'Железнодорожный', 'right', 55.0390000, 82.9080000, 2, '30x16 м', 'Полиуретан', true, true, 'Стандартный открытый корт для соревнований и тренировок школьных команд.', true),

-- Волейбол (правый берег)
(19, 'Волейбольный корт парка «Берёзовая роща»', 'г. Новосибирск, ул. Кошурникова, 17', 'Дзержинский', 'right', 55.0470000, 82.9600000, 3, '18x9 м', 'Спортивная резина', false, true, 'Парковый волейбольный корт с регулируемой турнирной сеткой.', true),
(20, 'Волейбольная площадка «Сосновый бор»', 'г. Новосибирск, ул. Бардина, 4', 'Калининский', 'right', 55.0810000, 82.9480000, 3, '20x10 м', 'Резиновая крошка', true, true, 'Волейбольный сектор в живописном сосновом бору с мачтовым светом.', true),
(21, 'Волейбольная площадка «Заельцовский»', 'г. Новосибирск, ул. Парковая, 88', 'Заельцовский', 'right', 55.0680000, 82.8620000, 3, '18x9 м', 'Полимерный хард', true, true, 'Современная волейбольная арена с судейской вышкой.', true),
(22, 'Волейбольный сектор Михайловской набережной', 'г. Новосибирск, ул. Большевистская, 12', 'Октябрьский', 'right', 55.0090000, 82.9410000, 3, '19x10 м', 'Спортивный кварц / резина', true, true, 'Открытая спортивная площадка на набережной Оби.', true),

-- Универсальная площадка (правый берег)
(23, 'Универсальный спорткомплекс Лицея № 22', 'г. Новосибирск, ул. Советская, 63', 'Центральный', 'right', 55.0380000, 82.9150000, 4, '40x20 м', 'Полиуретан', true, true, 'Многофункциональная коробка со стойками и мини-футбольными воротами.', true),
(24, 'Спортплощадка Гимназии № 1', 'г. Новосибирск, ул. Красный проспект, 48', 'Центральный', 'right', 55.0340000, 82.9180000, 4, '36x18 м', 'Резиновая крошка', true, true, 'Универсальный корт для школьных занятий футболом и баскетболом.', true),
(25, 'Многофункциональная площадка Лицея № 126', 'г. Новосибирск, ул. Народная, 33', 'Калининский', 'right', 55.0710000, 82.9650000, 4, '40x20 м', 'Тартан', true, true, 'Современный комплекс для командных игр нескольких соседних школ.', true),
(26, 'Универсальная коробка СОШ № 153', 'г. Новосибирск, ул. Селезнева, 92', 'Дзержинский', 'right', 55.0460000, 82.9490000, 4, '38x19 м', 'Мастерфайбр', true, true, 'Открытый корт со стальным ограждением и защитными сетками.', true),

-- Легкая атлетика (правый берег)
(27, 'Спортивное ядро СОШ № 54', 'г. Новосибирск, ул. Крылова, 18', 'Центральный', 'right', 55.0425000, 82.9280000, 5, '400 м дорожки', 'Профессиональный тартан', true, true, 'Полноразмерные беговые дорожки, прыжковый сектор и сектор ОФП.', true),
(28, 'Стадион «Красное знамя» (легкая атлетика)', 'г. Новосибирск, ул. Тимирязева, 5', 'Заельцовский', 'right', 55.0620000, 82.8940000, 5, '400 м дорожки', 'Резиновое покрытие', true, true, 'Легкоатлетический стадион с секторами для прыжков в длину и высоту.', true),
(29, 'Легкоатлетический комплекс НГУЭУ', 'г. Новосибирск, ул. Ядринцевская, 53', 'Центральный', 'right', 55.0360000, 82.9320000, 5, '200 м дорожки', 'Бесшовный полиуретан', true, true, 'Круговые дорожки для бега, турники и оборудование для общефизической подготовки.', true),
(30, 'Стадион СГУПС (легкоатлетическая арена)', 'г. Новосибирск, ул. Залесского, 3', 'Заельцовский', 'right', 55.0670000, 82.9130000, 5, '400 м дорожки', 'Тартановое покрытие', true, true, 'Арена с 6 беговыми дорожками, ямами с песком и легкоатлетическими барьерами.', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, bank = EXCLUDED.bank, district = EXCLUDED.district;

SELECT setval('venues_id_seq', (SELECT MAX(id) FROM venues));

-- 6. Оборудование площадок (по 3-4 единицы для каждой из 30 площадок)
INSERT INTO venue_equipment (venue_id, name, quantity, condition) VALUES
-- 1 (Футбол)
(1, 'Ворота для мини-футбола со стальной сеткой', 2, 'Отличное'),
(1, 'Угловые флажки на гибких стойках', 4, 'Хорошее'),
(1, 'Комплект конусов для тренировок', 20, 'Отличное'),
-- 2 (Футбол)
(2, 'Ворота полноразмерные футбольные', 2, 'Хорошее'),
(2, 'Защитная сетка за воротами (высота 4м)', 2, 'Отличное'),
(2, 'Скамейки для запасных игроков', 2, 'Хорошее'),
-- 3 (Баскетбол)
(3, 'Баскетбольные щиты из оргстекла с кольцами', 2, 'Отличное'),
(3, 'Защитные протекторы на баскетбольные стойки', 2, 'Хорошее'),
(3, 'Судейский столик со скамьей', 1, 'Хорошее'),
-- 4 (Баскетбол)
(4, 'Стритбольные стойки антивандальные', 2, 'Отличное'),
(4, 'Разметочные линии износостойкие', 1, 'Отличное'),
(4, 'Парковые скамьи с навесом', 2, 'Хорошее'),
-- 5 (Волейбол)
(5, 'Волейбольные стойки бетонированные', 2, 'Хорошее'),
(5, 'Волейбольная сетка тренировочная', 1, 'Отличное'),
(5, 'Антенны волейбольные с карманами', 2, 'Отличное'),
-- 6 (Волейбол)
(6, 'Стойки телескопические с лебедкой', 2, 'Отличное'),
(6, 'Сетка турнирная с тросом', 1, 'Отличное'),
(6, 'Судейская вышка складная', 1, 'Хорошее'),
-- 7 (Универсальная)
(7, 'Комбинированные ворота (футбол + баскетбол)', 2, 'Отличное'),
(7, 'Съемные волейбольные стойки', 2, 'Хорошее'),
(7, 'Инвентарный шкаф для мячей', 1, 'Хорошее'),
-- 8 (Универсальная)
(8, 'Мини-футбольные ворота с сеткой', 2, 'Отличное'),
(8, 'Баскетбольные щиты тренировочные', 2, 'Отличное'),
(8, 'Комплект разметки для 3 видов спорта', 1, 'Отличное'),
-- 9 (Легкая атлетика)
(9, 'Стартовые легкоатлетические колодки', 6, 'Отличное'),
(9, 'Эстафетные палочки (комплект)', 4, 'Отличное'),
(9, 'Яма для прыжков в длину с песком и бруском', 1, 'Отличное'),
(9, 'Турники и брусья для ОФП', 3, 'Хорошее'),
-- 10 (Легкая атлетика)
(10, 'Планка для прыжков в высоту со стойками', 1, 'Хорошее'),
(10, 'Маты поролоновые в чехлах для приземления', 2, 'Хорошее'),
(10, 'Гимнастический городок для ОФП', 1, 'Отличное'),
-- 11 (Футбол)
(11, 'Ворота со стекловолоконной сеткой', 2, 'Отличное'),
(11, 'Флажки угловые на гибких опорах', 4, 'Отличное'),
(11, 'Сетки гашения ударов', 2, 'Отличное'),
-- 12 (Футбол)
(12, 'Тренировочные ворота переносные', 2, 'Отличное'),
(12, 'Разминочные барьеры координационные', 10, 'Отличное'),
(12, 'Скамейки с пластиковыми креслами', 4, 'Хорошее'),
-- 13 (Футбол)
(13, 'Футбольные ворота стационарные', 2, 'Хорошее'),
(13, 'Сетка капроновая узловая', 2, 'Отличное'),
(13, 'Электронное табло счета', 1, 'Хорошее'),
-- 14 (Футбол)
(14, 'Ворота для мини-футбола 3x2 м', 2, 'Отличное'),
(14, 'Оградительная сетка по периметру', 1, 'Отличное'),
(14, 'Скамья для переодевания игроков', 2, 'Хорошее'),
-- 15 (Баскетбол)
(15, 'Профессиональные щиты со складными кольцами', 2, 'Отличное'),
(15, 'Мягкая обивка стоек и щитов', 2, 'Отличное'),
(15, 'Электронный счетчик времени атаки', 1, 'Отличное'),
-- 16 (Баскетбол)
(16, 'Антивандальные щиты с цепными сетками', 2, 'Отличное'),
(16, 'Ударопрочные стойки стальные', 2, 'Хорошее'),
(16, 'Скамейки уличные металлические', 3, 'Хорошее'),
-- 17 (Баскетбол)
(17, 'Баскетбольные кольца с сеткой', 2, 'Хорошее'),
(17, 'Щиты фанерные влагостойкие', 2, 'Хорошее'),
(17, 'Урна и стойка для инвентаря', 2, 'Хорошее'),
-- 18 (Баскетбол)
(18, 'Щиты из закаленного стекла', 2, 'Отличное'),
(18, 'Кольца подпружиненные соревновательные', 2, 'Отличное'),
(18, 'Судейский столик переносной', 1, 'Отличное'),
-- 19 (Волейбол)
(19, 'Стойки волейбольные со стаканами в грунте', 2, 'Хорошее'),
(19, 'Сетка с регулировкой натяжения', 1, 'Отличное'),
(19, 'Защитная окантовка стоек', 2, 'Хорошее'),
-- 20 (Волейбол)
(20, 'Волейбольная сетка турнирная', 1, 'Отличное'),
(20, 'Стойки телескопические алюминиевые', 2, 'Отличное'),
(20, 'Скамейки парковые со спинкой', 3, 'Хорошее'),
-- 21 (Волейбол)
(21, 'Стойки со встроенным червячным механизмом', 2, 'Отличное'),
(21, 'Сетка турнирная с тросом Kevlar', 1, 'Отличное'),
(21, 'Судейская вышка металлическая', 1, 'Отличное'),
-- 22 (Волейбол)
(22, 'Стойки пляжные и парковые волейбольные', 2, 'Хорошее'),
(22, 'Сетка всепогодная полипропиленовая', 1, 'Отличное'),
(22, 'Ограничительные ленты разметки', 1, 'Хорошее'),
-- 23 (Универсальная)
(23, 'Ворота совмещенные (мини-футбол/баскетбол)', 2, 'Отличное'),
(23, 'Стойки волейбольные мобильные', 2, 'Отличное'),
(23, 'Сетка оградительная 4-метровая', 1, 'Отличное'),
-- 24 (Универсальная)
(24, 'Ворота школьные мини-футбольные', 2, 'Хорошее'),
(24, 'Баскетбольные щиты тренировочные', 2, 'Хорошее'),
(24, 'Сетка разделительная площадки', 1, 'Хорошее'),
-- 25 (Универсальная)
(25, 'Комбинированные спортивные стойки', 2, 'Отличное'),
(25, 'Защитные ограждения за воротами', 2, 'Отличное'),
(25, 'Ящик для хранения мячей и манишек', 1, 'Отличное'),
-- 26 (Универсальная)
(26, 'Ворота хоккейные и мини-футбольные', 2, 'Хорошее'),
(26, 'Баскетбольные щиты с кольцами', 2, 'Отличное'),
(26, 'Осветительные прожекторы светодиодные', 4, 'Отличное'),
-- 27 (Легкая атлетика)
(27, 'Стартовые колодки легкоатлетические', 4, 'Отличное'),
(27, 'Прыжковая яма с грабельками и планкой', 1, 'Отличное'),
(27, 'Комплект барьеров регулируемых', 6, 'Отличное'),
(27, 'Шведская стенка и турники для ОФП', 2, 'Отличное'),
-- 28 (Легкая атлетика)
(28, 'Дорожки тартановые с разметкой дистанций', 4, 'Отличное'),
(28, 'Сектор прыжков в длину с бруском отталкивания', 1, 'Отличное'),
(28, 'Брусья параллельные гимнастические', 2, 'Хорошее'),
(28, 'Комплект флажков разметки виражей', 8, 'Отличное'),
-- 29 (Легкая атлетика)
(29, 'Электронный хронометр со стартовой кнопкой', 1, 'Отличное'),
(29, 'Эстафетные палочки анодированные', 6, 'Отличное'),
(29, 'Силовой комплекс турников и перекладин', 1, 'Отличное'),
-- 30 (Легкая атлетика)
(30, '6 беговых круговых дорожек 400м', 1, 'Отличное'),
(30, 'Сектор для прыжков в высоту с матами', 1, 'Отличное'),
(30, 'Яма для прыжков в длину двойная', 1, 'Отличное'),
(30, 'Гимнастический комплекс ОФП разновысокий', 1, 'Отличное');

-- 7. Фотографии площадок (реальные + SVG схемы)
INSERT INTO venue_photos (venue_id, photo_url, sort_order, is_real, author, license, license_url, source_url, title) VALUES
(1, '/img/venues/real/football/2.jpg', 1, true, 'Roy Zuo', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:(20240529)_Brandenburger_Tor,_UEFA_EURO_2024_01.jpg', '(20240529) Brandenburger Tor, UEFA EURO 2024 01'),
(1, '/img/venues/real/football/3.jpg', 2, true, 'Roy Zuo', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:(20240529)_Brandenburger_Tor,_UEFA_EURO_2024_02.jpg', '(20240529) Brandenburger Tor, UEFA EURO 2024 02'),
(1, '/img/venues/football/2.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (football)'),
(2, '/img/venues/real/football/3.jpg', 1, true, 'Roy Zuo', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:(20240529)_Brandenburger_Tor,_UEFA_EURO_2024_02.jpg', '(20240529) Brandenburger Tor, UEFA EURO 2024 02'),
(2, '/img/venues/real/football/4.jpg', 2, true, 'PattayaPatrol', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:DZ6_2354_Empty_bleachers_and_a_covered_grandstand_overlook_a_quiet_artificial-turf_sports_field_at_dusk.jpg', 'DZ6 2354 Empty bleachers and a covered grandstand overlook a quiet artificial-turf sports field at dusk'),
(2, '/img/venues/football/3.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (football)'),
(3, '/img/venues/real/basketball/4.jpg', 1, true, 'Mertbiol', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Outdoor_basketball_court,_Hurst_Park,_Molesey,_Surrey_01.jpg', 'Outdoor basketball court, Hurst Park, Molesey, Surrey 01'),
(3, '/img/venues/real/basketball/5.jpg', 2, true, 'Knowledge Era', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Kai_Chuen_Court_Basketball_Court.jpg', 'Kai Chuen Court Basketball Court'),
(3, '/img/venues/basketball/4.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (basketball)'),
(4, '/img/venues/real/basketball/5.jpg', 1, true, 'Knowledge Era', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Kai_Chuen_Court_Basketball_Court.jpg', 'Kai Chuen Court Basketball Court'),
(4, '/img/venues/real/basketball/6.jpg', 2, true, 'PixelManiatiK', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:One_on_one.jpg', 'One on one'),
(4, '/img/venues/basketball/1.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (basketball)'),
(5, '/img/venues/real/volleyball/6.jpg', 1, true, 'Mx. Granger', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Sand_volleyball_court_at_McNears_Beach.jpg', 'Sand volleyball court at McNears Beach'),
(5, '/img/venues/real/volleyball/7.jpg', 2, true, 'Catherine from Australia', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Beach_Volleyball_in_Australia.jpg', 'Beach Volleyball in Australia'),
(5, '/img/venues/volleyball/2.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (volleyball)'),
(6, '/img/venues/real/volleyball/7.jpg', 1, true, 'Catherine from Australia', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Beach_Volleyball_in_Australia.jpg', 'Beach Volleyball in Australia'),
(6, '/img/venues/real/volleyball/8.jpg', 2, true, 'Sixflashphoto', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Scioto_Audubon_-_Volleyball_Courts_1.jpg', 'Scioto Audubon - Volleyball Courts 1'),
(6, '/img/venues/volleyball/3.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (volleyball)'),
(7, '/img/venues/real/universal/8.jpg', 1, true, 'Ssu', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Nardo_skole_-_ballbinge.jpg', 'Nardo skole - ballbinge'),
(7, '/img/venues/real/universal/1.jpg', 2, true, 'Bjørn Nesheim', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 'https://commons.wikimedia.org/wiki/File:Ball-bin-P1080178.jpg', 'Ball-bin-P1080178'),
(7, '/img/venues/universal/4.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (universal)'),
(8, '/img/venues/real/universal/1.jpg', 1, true, 'Bjørn Nesheim', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 'https://commons.wikimedia.org/wiki/File:Ball-bin-P1080178.jpg', 'Ball-bin-P1080178'),
(8, '/img/venues/real/universal/2.jpg', 2, true, 'Pendleparks', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Coates_Avenue_Multi-Use_Games_Area.jpg', 'Coates Avenue Multi-Use Games Area'),
(8, '/img/venues/universal/1.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (universal)'),
(9, '/img/venues/real/athletics/2.jpg', 1, true, 'derivative work: Jesfr ( talk ) Track_and_field_stadium.jpg : Eija', 'CC BY 1.0', 'https://creativecommons.org/licenses/by/1.0', 'https://commons.wikimedia.org/wiki/File:Track_and_field_stadium-2.jpg', 'Track and field stadium-2'),
(9, '/img/venues/real/athletics/3.jpg', 2, true, 'Joe Mabel', 'CC BY-SA 3.0', 'http://creativecommons.org/licenses/by-sa/3.0/', 'https://commons.wikimedia.org/wiki/File:Seattle_-_Garfield_High_School_track_01.jpg', 'Seattle - Garfield High School track 01'),
(9, '/img/venues/athletics/2.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (athletics)'),
(10, '/img/venues/real/athletics/3.jpg', 1, true, 'Joe Mabel', 'CC BY-SA 3.0', 'http://creativecommons.org/licenses/by-sa/3.0/', 'https://commons.wikimedia.org/wiki/File:Seattle_-_Garfield_High_School_track_01.jpg', 'Seattle - Garfield High School track 01'),
(10, '/img/venues/real/athletics/4.jpg', 2, true, 'Celeste', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Track_and_field_numbers.jpg', 'Track and field numbers'),
(10, '/img/venues/athletics/3.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (athletics)'),
(11, '/img/venues/real/football/4.jpg', 1, true, 'PattayaPatrol', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:DZ6_2354_Empty_bleachers_and_a_covered_grandstand_overlook_a_quiet_artificial-turf_sports_field_at_dusk.jpg', 'DZ6 2354 Empty bleachers and a covered grandstand overlook a quiet artificial-turf sports field at dusk'),
(11, '/img/venues/real/football/5.jpg', 2, true, 'PattayaPatrol', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:DZ6_2362_A_quiet_evening_at_the_stadium_-_a_covered_walkway_leading_down_to_the_green_pitch_as_players_practice_below.jpg', 'DZ6 2362 A quiet evening at the stadium - a covered walkway leading down to the green pitch as players practice below'),
(11, '/img/venues/football/4.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (football)'),
(12, '/img/venues/real/football/5.jpg', 1, true, 'PattayaPatrol', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:DZ6_2362_A_quiet_evening_at_the_stadium_-_a_covered_walkway_leading_down_to_the_green_pitch_as_players_practice_below.jpg', 'DZ6 2362 A quiet evening at the stadium - a covered walkway leading down to the green pitch as players practice below'),
(12, '/img/venues/real/football/6.jpg', 2, true, 'DoraNassolo', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Football_pitch_in_the_middle_of_Kitubulu_Forest_Beach_Reserve.jpg', 'Football pitch in the middle of Kitubulu Forest Beach Reserve'),
(12, '/img/venues/football/1.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (football)'),
(13, '/img/venues/real/football/6.jpg', 1, true, 'DoraNassolo', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Football_pitch_in_the_middle_of_Kitubulu_Forest_Beach_Reserve.jpg', 'Football pitch in the middle of Kitubulu Forest Beach Reserve'),
(13, '/img/venues/real/football/7.jpg', 2, true, 'Nguyendinh Deptrai', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Bong_da_mini.jpg', 'Bong da mini'),
(13, '/img/venues/football/2.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (football)'),
(14, '/img/venues/real/football/7.jpg', 1, true, 'Nguyendinh Deptrai', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Bong_da_mini.jpg', 'Bong da mini'),
(14, '/img/venues/real/football/8.jpg', 2, true, 'Tombus20032000', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Ping_Che_Mini_Soccer_Pitch_2025.jpg', 'Ping Che Mini Soccer Pitch 2025'),
(14, '/img/venues/football/3.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (football)'),
(15, '/img/venues/real/basketball/8.jpg', 1, true, 'Free2barredo', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Street_Basketball_in_Buhi_02.jpg', 'Street Basketball in Buhi 02'),
(15, '/img/venues/real/basketball/1.jpg', 2, true, 'Editor5807', 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0', 'https://commons.wikimedia.org/wiki/File:Sandown_outdoor_gym_basketball_court.JPG', 'Sandown outdoor gym basketball court'),
(15, '/img/venues/basketball/4.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (basketball)'),
(16, '/img/venues/real/basketball/1.jpg', 1, true, 'Editor5807', 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0', 'https://commons.wikimedia.org/wiki/File:Sandown_outdoor_gym_basketball_court.JPG', 'Sandown outdoor gym basketball court'),
(16, '/img/venues/real/basketball/2.jpg', 2, true, 'Vyro30', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Telok_blangah_cresent_basketball_court.jpg', 'Telok blangah cresent basketball court'),
(16, '/img/venues/basketball/1.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (basketball)'),
(17, '/img/venues/real/basketball/2.jpg', 1, true, 'Vyro30', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Telok_blangah_cresent_basketball_court.jpg', 'Telok blangah cresent basketball court'),
(17, '/img/venues/real/basketball/3.jpg', 2, true, 'Mertbiol', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Outdoor_basketball_court,_Hurst_Park,_Molesey,_Surrey_02.jpg', 'Outdoor basketball court, Hurst Park, Molesey, Surrey 02'),
(17, '/img/venues/basketball/2.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (basketball)'),
(18, '/img/venues/real/basketball/3.jpg', 1, true, 'Mertbiol', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Outdoor_basketball_court,_Hurst_Park,_Molesey,_Surrey_02.jpg', 'Outdoor basketball court, Hurst Park, Molesey, Surrey 02'),
(18, '/img/venues/real/basketball/4.jpg', 2, true, 'Mertbiol', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Outdoor_basketball_court,_Hurst_Park,_Molesey,_Surrey_01.jpg', 'Outdoor basketball court, Hurst Park, Molesey, Surrey 01'),
(18, '/img/venues/basketball/3.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (basketball)'),
(19, '/img/venues/real/volleyball/4.jpg', 1, true, 'Dom Crossley', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:2012_Summer_Olympics_-_Beach_volleyball.jpg', '2012 Summer Olympics - Beach volleyball'),
(19, '/img/venues/real/volleyball/5.jpg', 2, true, 'Jon Curnow', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Beach_Volleyball_horse_guards.jpg', 'Beach Volleyball horse guards'),
(19, '/img/venues/volleyball/4.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (volleyball)'),
(20, '/img/venues/real/volleyball/5.jpg', 1, true, 'Jon Curnow', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Beach_Volleyball_horse_guards.jpg', 'Beach Volleyball horse guards'),
(20, '/img/venues/real/volleyball/6.jpg', 2, true, 'Mx. Granger', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Sand_volleyball_court_at_McNears_Beach.jpg', 'Sand volleyball court at McNears Beach'),
(20, '/img/venues/volleyball/1.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (volleyball)'),
(21, '/img/venues/real/volleyball/6.jpg', 1, true, 'Mx. Granger', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Sand_volleyball_court_at_McNears_Beach.jpg', 'Sand volleyball court at McNears Beach'),
(21, '/img/venues/real/volleyball/7.jpg', 2, true, 'Catherine from Australia', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Beach_Volleyball_in_Australia.jpg', 'Beach Volleyball in Australia'),
(21, '/img/venues/volleyball/2.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (volleyball)'),
(22, '/img/venues/real/volleyball/7.jpg', 1, true, 'Catherine from Australia', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Beach_Volleyball_in_Australia.jpg', 'Beach Volleyball in Australia'),
(22, '/img/venues/real/volleyball/8.jpg', 2, true, 'Sixflashphoto', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Scioto_Audubon_-_Volleyball_Courts_1.jpg', 'Scioto Audubon - Volleyball Courts 1'),
(22, '/img/venues/volleyball/3.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (volleyball)'),
(23, '/img/venues/real/universal/8.jpg', 1, true, 'Ssu', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Nardo_skole_-_ballbinge.jpg', 'Nardo skole - ballbinge'),
(23, '/img/venues/real/universal/1.jpg', 2, true, 'Bjørn Nesheim', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 'https://commons.wikimedia.org/wiki/File:Ball-bin-P1080178.jpg', 'Ball-bin-P1080178'),
(23, '/img/venues/universal/4.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (universal)'),
(24, '/img/venues/real/universal/1.jpg', 1, true, 'Bjørn Nesheim', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 'https://commons.wikimedia.org/wiki/File:Ball-bin-P1080178.jpg', 'Ball-bin-P1080178'),
(24, '/img/venues/real/universal/2.jpg', 2, true, 'Pendleparks', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Coates_Avenue_Multi-Use_Games_Area.jpg', 'Coates Avenue Multi-Use Games Area'),
(24, '/img/venues/universal/1.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (universal)'),
(25, '/img/venues/real/universal/2.jpg', 1, true, 'Pendleparks', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Coates_Avenue_Multi-Use_Games_Area.jpg', 'Coates Avenue Multi-Use Games Area'),
(25, '/img/venues/real/universal/3.jpg', 2, true, 'Vibber2000', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Bj%C3%B8rnsletta_skole_med_piltregjerde.jpg', 'Bjørnsletta skole med piltregjerde'),
(25, '/img/venues/universal/2.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (universal)'),
(26, '/img/venues/real/universal/3.jpg', 1, true, 'Vibber2000', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Bj%C3%B8rnsletta_skole_med_piltregjerde.jpg', 'Bjørnsletta skole med piltregjerde'),
(26, '/img/venues/real/universal/4.jpg', 2, true, 'Ssu', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Veien_skole_-_ballbingen.jpg', 'Veien skole - ballbingen'),
(26, '/img/venues/universal/3.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (universal)'),
(27, '/img/venues/real/athletics/4.jpg', 1, true, 'Celeste', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0', 'https://commons.wikimedia.org/wiki/File:Track_and_field_numbers.jpg', 'Track and field numbers'),
(27, '/img/venues/real/athletics/5.jpg', 2, true, 'Neukoln', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 'https://commons.wikimedia.org/wiki/File:RLZ_Athletics_stadium_05.JPG', 'RLZ Athletics stadium 05'),
(27, '/img/venues/athletics/4.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (athletics)'),
(28, '/img/venues/real/athletics/5.jpg', 1, true, 'Neukoln', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 'https://commons.wikimedia.org/wiki/File:RLZ_Athletics_stadium_05.JPG', 'RLZ Athletics stadium 05'),
(28, '/img/venues/real/athletics/6.jpg', 2, true, 'Stanislav Larkov', 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0', 'https://commons.wikimedia.org/wiki/File:Running_(athletics)_-_panoramio_-_Stanislav_Larkov_(64).jpg', 'Running (athletics) - panoramio - Stanislav Larkov (64)'),
(28, '/img/venues/athletics/1.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (athletics)'),
(29, '/img/venues/real/athletics/6.jpg', 1, true, 'Stanislav Larkov', 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0', 'https://commons.wikimedia.org/wiki/File:Running_(athletics)_-_panoramio_-_Stanislav_Larkov_(64).jpg', 'Running (athletics) - panoramio - Stanislav Larkov (64)'),
(29, '/img/venues/real/athletics/7.jpg', 2, true, 'Basotxerri', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Vitoria_-_Mendizorrotza_02.jpg', 'Vitoria - Mendizorrotza 02'),
(29, '/img/venues/athletics/2.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (athletics)'),
(30, '/img/venues/real/athletics/7.jpg', 1, true, 'Basotxerri', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Vitoria_-_Mendizorrotza_02.jpg', 'Vitoria - Mendizorrotza 02'),
(30, '/img/venues/real/athletics/8.jpg', 2, true, 'NWSPhoenix', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:Track_and_Field_Phoenix.jpg', 'Track and Field Phoenix'),
(30, '/img/venues/athletics/3.svg', 3, false, 'SportBook Vector Assets', 'Внутренний ресурс системы', NULL, NULL, 'Векторная схема площадки (athletics)');

-- 8. Блокировки на ремонт
-- Блокировка площадки № 3 через 6 дней
INSERT INTO venue_blocks (venue_id, start_at, end_at, reason, note) VALUES
(3, 
 (CURRENT_DATE + INTERVAL '6 days' + TIME '08:00:00') AT TIME ZONE 'Asia/Novosibirsk', 
 (CURRENT_DATE + INTERVAL '6 days' + TIME '17:00:00') AT TIME ZONE 'Asia/Novosibirsk', 
 'Плановое обновление полиуретанового покрытия и колец', 
 'Распоряжение управления физической культуры и спорта мэрии г. Новосибирска'),
(15,
 (CURRENT_DATE + INTERVAL '8 days' + TIME '09:00:00') AT TIME ZONE 'Asia/Novosibirsk', 
 (CURRENT_DATE + INTERVAL '8 days' + TIME '18:00:00') AT TIME ZONE 'Asia/Novosibirsk', 
 'Техническое обслуживание освещения и защитных сеток', 
 'Плановые работы Горсвет');

-- 9. Бронирования (28 бронирований без пересечений, прошлые и будущие)
INSERT INTO bookings (venue_id, user_id, organization_id, start_at, end_at, purpose, participants_count, status) VALUES
-- Прошедшие бронирования
(1, 5, 1, (CURRENT_DATE - INTERVAL '3 days' + TIME '10:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE - INTERVAL '3 days' + TIME '11:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Урок физкультуры (футбол 8 класс)', 24, 'confirmed'),
(3, 5, 1, (CURRENT_DATE - INTERVAL '2 days' + TIME '14:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE - INTERVAL '2 days' + TIME '15:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Школьная секция по баскетболу', 16, 'confirmed'),
(7, 5, 1, (CURRENT_DATE - INTERVAL '2 days' + TIME '16:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE - INTERVAL '2 days' + TIME '17:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Товарищеская игра по волейболу', 18, 'confirmed'),
(11, 1, 4, (CURRENT_DATE - INTERVAL '1 day' + TIME '09:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE - INTERVAL '1 day' + TIME '10:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Урок физкультуры Лицея №22', 25, 'confirmed'),
(23, 1, 4, (CURRENT_DATE - INTERVAL '1 day' + TIME '11:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE - INTERVAL '1 day' + TIME '12:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Подготовка к районной спартакиаде', 20, 'confirmed'),
(27, 2, 5, (CURRENT_DATE - INTERVAL '1 day' + TIME '13:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE - INTERVAL '1 day' + TIME '15:00:00') AT TIME ZONE 'Asia/Novosibirsk', 'Сдача норм ГТО по бегу', 30, 'confirmed'),

-- Сегодняшние и завтрашние бронирования
(1, 5, 1, (CURRENT_DATE + INTERVAL '1 day' + TIME '09:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '10:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Урок физкультуры (футбол)', 22, 'confirmed'),
(1, 5, 1, (CURRENT_DATE + INTERVAL '1 day' + TIME '14:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '15:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Тренировка сборной школы по футболу', 18, 'confirmed'),
(2, 5, 2, (CURRENT_DATE + INTERVAL '1 day' + TIME '11:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '12:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Межклассовый футбольный турнир', 20, 'confirmed'),
(3, 5, 1, (CURRENT_DATE + INTERVAL '1 day' + TIME '16:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '17:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Баскетбольный матч 9-10 классы', 15, 'confirmed'),
(5, 5, 1, (CURRENT_DATE + INTERVAL '1 day' + TIME '10:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '11:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Урок волейбола на открытом воздухе', 16, 'confirmed'),
(7, 5, 1, (CURRENT_DATE + INTERVAL '1 day' + TIME '13:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '14:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Урок физкультуры 11А класс', 25, 'confirmed'),
(9, 5, 1, (CURRENT_DATE + INTERVAL '1 day' + TIME '11:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '12:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Беговая тренировка и ОФП', 20, 'confirmed'),

-- Правый берег завтра
(11, 1, 4, (CURRENT_DATE + INTERVAL '1 day' + TIME '10:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '11:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Урок физкультуры Лицея №22', 26, 'confirmed'),
(11, 2, 5, (CURRENT_DATE + INTERVAL '1 day' + TIME '13:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '14:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Тренировка сборной Гимназии №1', 20, 'confirmed'),
(12, 1, 8, (CURRENT_DATE + INTERVAL '1 day' + TIME '11:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '12:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Футбол для 7-х классов', 22, 'confirmed'),
(15, 1, 4, (CURRENT_DATE + INTERVAL '1 day' + TIME '15:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '16:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Стритбол в Нарымском сквере', 14, 'confirmed'),
(16, 2, 5, (CURRENT_DATE + INTERVAL '1 day' + TIME '12:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '13:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Первенство по баскетболу', 16, 'confirmed'),
(19, 1, 4, (CURRENT_DATE + INTERVAL '1 day' + TIME '14:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '15:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Волейбольный турнир', 18, 'confirmed'),
(23, 1, 4, (CURRENT_DATE + INTERVAL '1 day' + TIME '09:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '10:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Урок физкультуры (мини-футбол)', 24, 'confirmed'),
(24, 2, 5, (CURRENT_DATE + INTERVAL '1 day' + TIME '11:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '12:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Подвижные игры и эстафеты', 25, 'confirmed'),
(27, 2, 6, (CURRENT_DATE + INTERVAL '1 day' + TIME '10:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '1 day' + TIME '11:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Легкая атлетика: спринт 60м', 28, 'confirmed'),

-- Предстоящие дни (включая pending и cancelled заявки)
(2, 5, 2, (CURRENT_DATE + INTERVAL '2 days' + TIME '10:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '2 days' + TIME '11:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Спортивная эстафета', 30, 'pending'),
(4, 5, 1, (CURRENT_DATE + INTERVAL '2 days' + TIME '14:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '2 days' + TIME '15:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Баскетбол 10-11 класс', 16, 'confirmed'),
(13, 1, 9, (CURRENT_DATE + INTERVAL '2 days' + TIME '11:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '2 days' + TIME '12:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Заявка на матч по футболу', 22, 'pending'),
(17, 1, 4, (CURRENT_DATE + INTERVAL '2 days' + TIME '13:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '2 days' + TIME '14:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Отмененная тренировка из-за погоды', 15, 'cancelled'),
(21, 2, 10, (CURRENT_DATE + INTERVAL '3 days' + TIME '10:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '3 days' + TIME '11:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Волейбольная секция гимназии', 16, 'confirmed'),
(28, 1, 10, (CURRENT_DATE + INTERVAL '3 days' + TIME '14:00:00') AT TIME ZONE 'Asia/Novosibirsk', (CURRENT_DATE + INTERVAL '3 days' + TIME '15:30:00') AT TIME ZONE 'Asia/Novosibirsk', 'Бег на выносливость 1000м', 25, 'confirmed');
