import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as yaml from 'js-yaml';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../app.module';
import { buildSwaggerConfig } from '../swagger.config';

/**
 * Genera el artefacto `openapi.yaml` (Entregable 4) a partir de la misma
 * configuracion que sirve Swagger UI en /api.
 *
 *   npm run export:openapi
 *
 * No levanta el servidor (no hace listen): solo crea el contexto Nest para que
 * los decoradores @Api* esten registrados, arma el documento OpenAPI y lo
 * escribe como YAML en la raiz del repo. Es seguro: no toca la base de datos.
 */
async function exportOpenapi() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  const outPath = join(process.cwd(), 'openapi.yaml');

  writeFileSync(outPath, yaml.dump(document, { noRefs: true, sortKeys: false }));

  await app.close();

  // eslint-disable-next-line no-console
  console.log(`OpenAPI spec escrito en ${outPath}`);
}

exportOpenapi().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fallo al exportar el spec OpenAPI:', err);
  process.exit(1);
});
