import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { Cuenta } from '../src/models/Cuenta';

describe('Rutas de Transferencias', () => {

  it('Debería realizar una transferencia exitosa entre dos cuentas', async () => {
    const userOrigen = { nombre: 'Origen', email: `origen_${Date.now()}@atlaspay.com`, password: '123' };
    const reqOrigen = await request(app).post('/api/usuarios').send(userOrigen);
    const cvuOrigen = reqOrigen.body.data.cuenta.cvu;

    const resLogin = await request(app).post('/api/usuarios/login').send({
      email: userOrigen.email, password: userOrigen.password
    });
    const tokenOrigen = resLogin.body.token;

    const userDestino = { nombre: 'Destino', email: `destino_${Date.now()}@atlaspay.com`, password: '123' };
    const reqDestino = await request(app).post('/api/usuarios').send(userDestino);
    const cvuDestino = reqDestino.body.data.cuenta.cvu;

    await Cuenta.update(
      { saldo: 1000 },
      { where: { cvu: cvuOrigen } }
    );

    const resTransferencia = await request(app)
      .post('/api/transferencias')
      .set('Authorization', `Bearer ${tokenOrigen}`)
      .send({
        cvu_destino: cvuDestino,
        monto: 300,
        motivo: 'Pago de prueba Vitest'
      });

    expect(resTransferencia.statusCode).toBe(200);
    expect(resTransferencia.body.message).toBe('Transferencia realizada con exito');
    expect(Number(resTransferencia.body.comprobante.monto)).toBe(300);

    const cuentaOrigenPost = await Cuenta.findOne({ where: { cvu: cvuOrigen } });
    const cuentaDestinoPost = await Cuenta.findOne({ where: { cvu: cvuDestino } });

    expect(Number(cuentaOrigenPost?.saldo)).toBe(700); // Tenía 1000 - 300
    expect(Number(cuentaDestinoPost?.saldo)).toBe(300); // Tenía 0 + 300
  }, 15000);

 it('Debería rechazar la transferencia si el saldo es insuficiente', async () => {
    // 1. Creamos el usuario sin fondos y obtenemos su token
    const userSinPlata = { nombre: 'Seco', email: `seco_${Date.now()}@atlaspay.com`, password: '123' };
    await request(app).post('/api/usuarios').send(userSinPlata);
    
    const tokenSeco = (await request(app).post('/api/usuarios/login').send({
      email: userSinPlata.email, password: userSinPlata.password
    })).body.token;

    // 2. Creamos un usuario destino real para que pase la validación de existencia
    const userDestinoValido = { nombre: 'Destinatario', email: `dest_${Date.now()}@atlaspay.com`, password: '123' };
    const reqDestino = await request(app).post('/api/usuarios').send(userDestinoValido);
    const cvuDestinoReal = reqDestino.body.data.cuenta.cvu;

    // 3. Intentamos transferir, procede a fallar por saldo insuficiente
    const resRechazo = await request(app)
      .post('/api/transferencias')
      .set('Authorization', `Bearer ${tokenSeco}`)
      .send({
        cvu_destino: cvuDestinoReal,
        monto: 50000,
        motivo: 'Intento fallido'
      });

    expect(resRechazo.statusCode).toBe(400);
    expect(resRechazo.body.error).toBe('Saldo insuficiente');
  });
});