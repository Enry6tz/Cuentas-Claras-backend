import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Configuracion unica del documento OpenAPI.
 *
 * Se reutiliza tanto en `main.ts` (para servir Swagger UI en /api) como en
 * `scripts/export-openapi.ts` (para generar el artefacto openapi.yaml del
 * Entregable 4), de modo que ambos nunca se desincronizan.
 */
export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Cuentas Claras API')
    .setDescription(
      'API REST de Cuentas Claras: gestion de gastos compartidos en viajes ' +
        '(viajes, participantes, gastos, pagos, saldos e invitaciones).',
    )
    .setVersion('1.0.0')
    .addServer('http://localhost:3001', 'Local')
    .addServer('https://cuentas-claras-backend.onrender.com', 'Produccion')
    .addBearerAuth()
    .build();
}
