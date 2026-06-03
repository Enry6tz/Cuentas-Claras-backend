import { Logger } from '@nestjs/common';

// Silencia el ruido del Logger de Nest durante los tests.
// Muchos tests verifican casos de error (excepciones esperadas), y el servicio
// loguea esos errores antes de lanzarlos. Eso ensucia la salida de Jest sin
// aportar informacion: el test igual pasa. Aca silenciamos esos niveles.
beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
