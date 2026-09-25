import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app'; 

describe('Rutas de Usuarios', () => {

  // 1. TEST DE REGSTRO
  it('Debería crear un usuario nuevo y su cuenta', async () => {
    // Preparamos un usuario de prueba
    const nuevoUsuario = {
      nombre: 'Usuario Prueba',
      email: `test_${Date.now()}@atlaspay.com`, 
      password: 'MiPasswordSeguro123'
    };

    // Simulamos la petición HTTP
    const res = await request(app)
      .post('/api/usuarios')
      .send(nuevoUsuario);

    // Verificamos que la respuesta sea exactamente la que esperamos
    expect(res.statusCode).toBe(201); 
    expect(res.body.message).toBe('Usuario y cuenta creados con exito');
    expect(res.body.data.usuario.email).toBe(nuevoUsuario.email);
    expect(res.body.data.cuenta).toHaveProperty('cvu');
  });

  // 2. TEST DE LOGIN EXITOSO
  it('Debería iniciar sesión y devolver un token JWT', async () => {
    // Primero preparamos y registramos un usuario exclusivo para este test
    const credenciales = {
      nombre: 'Usuario Login',
      email: `login_${Date.now()}@atlaspay.com`,
      password: 'PasswordLogin123'
    };
    
    // Lo creamos en la base de datos
    await request(app).post('/api/usuarios').send(credenciales);

    // Ahora intentamos loguearnos con esas credenciales
    const res = await request(app)
      .post('/api/usuarios/login')
      .send({
        email: credenciales.email,
        password: credenciales.password
      });

    // Verificamos las aserciones del login
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Login exitoso');
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario.email).toBe(credenciales.email);
  });

  // 3. TEST DE LOGIN FALLIDO
  it('Debería fallar al intentar loguearse con credenciales inválidas', async () => {
    const res = await request(app)
      .post('/api/usuarios/login')
      .send({
        email: 'correo_que_no_existe@atlaspay.com',
        password: 'ClaveEquivocada123'
      });

    // Esperamos un error 401: Unauthorized
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Credenciales invalidas');
  });

});