-- Seed course data
DO $$
DECLARE
  c_id uuid;
BEGIN

-- LA ROQUETA GOLF (9 hoyos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('La Roqueta Golf', 9, 35, 113, 35.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,9),(c_id,2,3,7),(c_id,3,3,8),(c_id,4,5,3),(c_id,5,4,4),
(c_id,6,3,6),(c_id,7,5,1),(c_id,8,4,5),(c_id,9,5,2);

-- TARADELL GOLF (18 hoyos - 9 repetidos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Taradell Golf', 18, 72, 113, 68.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,9),(c_id,2,4,5),(c_id,3,4,1),(c_id,4,4,13),(c_id,5,3,17),
(c_id,6,4,15),(c_id,7,4,3),(c_id,8,5,7),(c_id,9,5,11),
(c_id,10,4,10),(c_id,11,4,6),(c_id,12,4,2),(c_id,13,4,14),(c_id,14,3,18),
(c_id,15,4,16),(c_id,16,4,4),(c_id,17,5,8),(c_id,18,5,12);

-- GOLF EL PRAT - OPEN
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf El Prat - Open', 18, 72, 130, 72.5) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,16),(c_id,2,5,6),(c_id,3,3,14),(c_id,4,4,10),(c_id,5,4,12),
(c_id,6,4,2),(c_id,7,5,8),(c_id,8,3,18),(c_id,9,4,4),
(c_id,10,5,3),(c_id,11,3,11),(c_id,12,4,9),(c_id,13,3,7),(c_id,14,4,15),
(c_id,15,4,17),(c_id,16,4,5),(c_id,17,4,1),(c_id,18,5,13);

-- GOLF EL PRAT - YELLOW
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf El Prat - Yellow', 18, 72, 125, 70.5) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,6),(c_id,2,3,16),(c_id,3,4,14),(c_id,4,5,14),(c_id,5,4,5),
(c_id,6,3,8),(c_id,7,4,4),(c_id,8,4,2),(c_id,9,5,10),
(c_id,10,4,1),(c_id,11,5,15),(c_id,12,3,13),(c_id,13,4,9),(c_id,14,4,11),
(c_id,15,4,1),(c_id,16,5,7),(c_id,17,3,17),(c_id,18,4,3);

-- CAMIRAL GOLF - STADIUM COURSE
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Camiral Golf - Stadium Course', 18, 72, 135, 74.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,3),(c_id,2,4,5),(c_id,3,5,13),(c_id,4,4,9),(c_id,5,3,7),
(c_id,6,4,11),(c_id,7,5,17),(c_id,8,3,15),(c_id,9,4,1),
(c_id,10,4,12),(c_id,11,3,16),(c_id,12,5,14),(c_id,13,4,6),(c_id,14,4,4),
(c_id,15,5,18),(c_id,16,3,10),(c_id,17,4,8),(c_id,18,4,2);

-- CAMIRAL GOLF - TOUR COURSE
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Camiral Golf - Tour Course', 18, 72, 138, 75.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,14),(c_id,2,3,18),(c_id,3,4,6),(c_id,4,4,2),(c_id,5,5,16),
(c_id,6,4,12),(c_id,7,5,8),(c_id,8,3,4),(c_id,9,4,10),
(c_id,10,5,9),(c_id,11,3,7),(c_id,12,4,11),(c_id,13,4,1),(c_id,14,3,13),
(c_id,15,5,5),(c_id,16,3,17),(c_id,17,4,3),(c_id,18,5,15);

-- INFINITUM - LAKES
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Infinitum - Lakes', 18, 72, 128, 71.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,15),(c_id,2,5,7),(c_id,3,4,17),(c_id,4,3,3),(c_id,5,4,11),
(c_id,6,4,13),(c_id,7,3,9),(c_id,8,4,5),(c_id,9,4,1),
(c_id,10,4,18),(c_id,11,4,10),(c_id,12,4,2),(c_id,13,4,16),(c_id,14,3,8),
(c_id,15,4,6),(c_id,16,5,4),(c_id,17,3,12),(c_id,18,5,14);

-- INFINITUM - HILLS
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Infinitum - Hills', 18, 72, 125, 70.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,17),(c_id,2,5,15),(c_id,3,3,5),(c_id,4,4,7),(c_id,5,4,9),
(c_id,6,4,11),(c_id,7,5,13),(c_id,8,3,1),(c_id,9,4,3),
(c_id,10,3,10),(c_id,11,5,14),(c_id,12,4,16),(c_id,13,4,8),(c_id,14,4,6),
(c_id,15,3,2),(c_id,16,4,4),(c_id,17,5,18),(c_id,18,4,12);

-- EMPORDA GOLF - LINKS
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Empordà Golf - Links', 18, 72, 126, 70.5) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,9),(c_id,2,4,5),(c_id,3,3,17),(c_id,4,4,13),(c_id,5,4,7),
(c_id,6,3,15),(c_id,7,4,11),(c_id,8,5,1),(c_id,9,4,3),
(c_id,10,4,16),(c_id,11,3,14),(c_id,12,5,8),(c_id,13,4,10),(c_id,14,4,4),
(c_id,15,3,18),(c_id,16,4,6),(c_id,17,4,2),(c_id,18,5,12);

-- EMPORDA GOLF - FOREST
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Empordà Golf - Forest', 18, 72, 130, 72.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,7),(c_id,2,3,15),(c_id,3,4,5),(c_id,4,5,9),(c_id,5,3,17),
(c_id,6,4,11),(c_id,7,5,1),(c_id,8,3,13),(c_id,9,4,3),
(c_id,10,4,8),(c_id,11,4,6),(c_id,12,3,18),(c_id,13,4,4),(c_id,14,3,16),
(c_id,15,4,12),(c_id,16,4,6),(c_id,17,4,10),(c_id,18,4,2);

-- GOLF BARCELONA - MASIA
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf Barcelona - Masía', 18, 72, 125, 70.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,5,9),(c_id,2,3,17),(c_id,3,4,3),(c_id,4,4,5),(c_id,5,3,11),
(c_id,6,4,7),(c_id,7,5,1),(c_id,8,4,13),(c_id,9,4,15),
(c_id,10,5,12),(c_id,11,4,10),(c_id,12,4,6),(c_id,13,5,2),(c_id,14,3,18),
(c_id,15,4,14),(c_id,16,3,16),(c_id,17,4,4),(c_id,18,4,8);

-- GOLF BARCELONA - SANT ESTEVE (9 hoyos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf Barcelona - Sant Esteve', 9, 27, 113, 27.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,3,2),(c_id,2,3,8),(c_id,3,3,6),(c_id,4,4,4),(c_id,5,4,1),
(c_id,6,3,5),(c_id,7,5,3),(c_id,8,3,7),(c_id,9,3,9);

-- GOLF SANT CUGAT (18 hoyos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf Sant Cugat', 18, 71, 120, 69.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,7),(c_id,2,4,9),(c_id,3,4,1),(c_id,4,4,5),(c_id,5,4,17),
(c_id,6,4,11),(c_id,7,5,3),(c_id,8,3,15),(c_id,9,3,13),
(c_id,10,5,2),(c_id,11,4,4),(c_id,12,3,8),(c_id,13,4,18),(c_id,14,3,16),
(c_id,15,4,12),(c_id,16,4,14),(c_id,17,3,10),(c_id,18,4,6);

-- GOLF DE PALS - PLATJA DE PALS (18 hoyos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf de Pals - Platja de Pals', 18, 72, 126, 71.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,14),(c_id,2,4,6),(c_id,3,4,12),(c_id,4,4,2),(c_id,5,5,4),
(c_id,6,3,18),(c_id,7,4,8),(c_id,8,5,10),(c_id,9,3,16),
(c_id,10,4,1),(c_id,11,3,17),(c_id,12,4,9),(c_id,13,4,13),(c_id,14,5,11),
(c_id,15,3,15),(c_id,16,5,13),(c_id,17,4,3),(c_id,18,5,7);

-- GOLF DE CALDES (18 hoyos - 9 repetidos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf de Caldes', 18, 72, 113, 68.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,5),(c_id,2,5,9),(c_id,3,3,15),(c_id,4,4,3),(c_id,5,3,17),
(c_id,6,4,11),(c_id,7,4,1),(c_id,8,5,7),(c_id,9,4,13),
(c_id,10,4,6),(c_id,11,5,10),(c_id,12,3,16),(c_id,13,4,4),(c_id,14,3,18),
(c_id,15,4,12),(c_id,16,4,2),(c_id,17,5,8),(c_id,18,4,14);

-- GOLF TORREMIRONA (18 hoyos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf Torremirona', 18, 72, 122, 70.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,18),(c_id,2,3,14),(c_id,3,4,2),(c_id,4,5,12),(c_id,5,4,6),
(c_id,6,5,8),(c_id,7,4,10),(c_id,8,4,4),(c_id,9,4,16),
(c_id,10,3,17),(c_id,11,4,9),(c_id,12,4,15),(c_id,13,5,13),(c_id,14,4,5),
(c_id,15,3,7),(c_id,16,4,1),(c_id,17,4,3),(c_id,18,5,11);

-- GOLF MONTANYA (18 hoyos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf Montanyà', 18, 72, 120, 69.5) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,8),(c_id,2,3,18),(c_id,3,4,14),(c_id,4,4,17),(c_id,5,5,9),
(c_id,6,3,15),(c_id,7,4,2),(c_id,8,4,12),(c_id,9,5,3),
(c_id,10,4,11),(c_id,11,4,7),(c_id,12,4,1),(c_id,13,5,5),(c_id,14,3,10),
(c_id,15,5,6),(c_id,16,4,4),(c_id,17,3,16),(c_id,18,4,13);

-- GOLF LA ROCA (18 hoyos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf La Roca', 18, 72, 119, 69.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,3),(c_id,2,3,1),(c_id,3,3,13),(c_id,4,5,15),(c_id,5,4,9),
(c_id,6,3,5),(c_id,7,4,17),(c_id,8,4,11),(c_id,9,4,7),
(c_id,10,4,10),(c_id,11,4,4),(c_id,12,3,14),(c_id,13,5,8),(c_id,14,4,2),
(c_id,15,3,12),(c_id,16,4,18),(c_id,17,5,6),(c_id,18,3,16);

-- GOLF PERALADA (18 hoyos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('Golf Peralada', 18, 72, 127, 71.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,4,18),(c_id,2,4,4),(c_id,3,4,6),(c_id,4,5,10),(c_id,5,4,2),
(c_id,6,4,16),(c_id,7,5,8),(c_id,8,4,12),(c_id,9,4,14),
(c_id,10,4,11),(c_id,11,5,3),(c_id,12,3,17),(c_id,13,5,5),(c_id,14,4,15),
(c_id,15,4,7),(c_id,16,4,1),(c_id,17,5,9),(c_id,18,4,13);

-- P&P ROC 3 - VERDE
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('P&P Roc 3 - Verde', 18, 54, 113, 54.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,3,2),(c_id,2,3,1),(c_id,3,3,14),(c_id,4,3,17),(c_id,5,3,4),
(c_id,6,3,16),(c_id,7,3,3),(c_id,8,3,9),(c_id,9,3,18),
(c_id,10,3,11),(c_id,11,3,5),(c_id,12,3,13),(c_id,13,3,8),(c_id,14,3,6),
(c_id,15,3,7),(c_id,16,3,15),(c_id,17,3,12),(c_id,18,3,10);

-- P&P ROC 3 - BLANCAS EPPA
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('P&P Roc 3 - Blancas EPPA', 18, 54, 113, 54.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,3,9),(c_id,2,3,18),(c_id,3,3,8),(c_id,4,3,16),(c_id,5,3,2),
(c_id,6,3,11),(c_id,7,3,1),(c_id,8,3,17),(c_id,9,3,12),
(c_id,10,3,10),(c_id,11,3,15),(c_id,12,3,7),(c_id,13,3,6),(c_id,14,3,5),
(c_id,15,3,13),(c_id,16,3,3),(c_id,17,3,4),(c_id,18,3,14);

-- P&P CAN CUYAS (9 hoyos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('P&P Can Cuyas', 9, 27, 113, 27.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,3,1),(c_id,2,3,2),(c_id,3,3,3),(c_id,4,3,7),(c_id,5,3,5),
(c_id,6,3,6),(c_id,7,3,8),(c_id,8,3,4),(c_id,9,3,9);

-- P&P EL VENDRELL (18 hoyos)
INSERT INTO public.courses (name, holes_count, par, slope, course_rating)
VALUES ('P&P El Vendrell', 18, 54, 113, 54.0) RETURNING id INTO c_id;
INSERT INTO public.holes (course_id, hole_number, par, stroke_index) VALUES
(c_id,1,3,1),(c_id,2,3,3),(c_id,3,3,5),(c_id,4,3,7),(c_id,5,3,9),
(c_id,6,3,11),(c_id,7,3,13),(c_id,8,3,15),(c_id,9,3,17),
(c_id,10,3,2),(c_id,11,3,4),(c_id,12,3,6),(c_id,13,3,8),(c_id,14,3,10),
(c_id,15,3,12),(c_id,16,3,14),(c_id,17,3,16),(c_id,18,3,18);

END $$;
