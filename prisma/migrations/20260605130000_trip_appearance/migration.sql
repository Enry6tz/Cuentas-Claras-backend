-- Apariencia del viaje: emoji y color elegidos en el front (ids 1..30).
ALTER TABLE "trips" ADD COLUMN "icon_id" INTEGER;
ALTER TABLE "trips" ADD COLUMN "color_id" INTEGER;
