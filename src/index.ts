import express from 'express';
import type { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { sequelize } from './db'; 
import { Usuario } from './models/Usuario';
import { Cuenta } from './models/Cuenta';
import { Transferencia } from './models/Transferencia';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validarToken, AuthRequest } from './middlewares/validarToken';


dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Servidor de Atlaspay funcionando correctamente' });
});

// Ruta de Register
app.post('/api/usuarios', async (req: Request, res: Response) => {
  try {
    const { nombre, email, password } = req.body;
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const nuevoUsuario = await Usuario.create({
      nombre,
      email,
      password_hash: hashedPassword 
    });

    const cvuAleatorio = Math.random().toString().slice(2, 22).padEnd(22, '0');
    const aliasAleatorio = nombre.toLowerCase().replace(/\s/g, '') + '.' + Math.floor(Math.random() * 1000) + '.atlas';

    const nuevaCuenta = await Cuenta.create({
      usuario_id: nuevoUsuario.id,
      cvu: cvuAleatorio,
      alias: aliasAleatorio
    });

    res.status(201).json({
      message: 'Usuario y cuenta creados con exito',
      data: {
        usuario: {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email
        },
        cuenta: {
          cvu: nuevaCuenta.cvu,
          alias: nuevaCuenta.alias,
          saldo: nuevaCuenta.saldo
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un problema al crear el usuario y la cuenta' });
  }
});

// Ruta para Login 
app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ where: { email } });
    
    if (!usuario) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    
    if (!passwordValido) {
      res.status(401).json({ error: 'Credenciales invalidas' });
      return;
    }

    // Generamos el Token de seguridad
    const firmaSecreta = process.env.JWT_SECRET || 'clave_super_secreta_de_desarrollo';
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      firmaSecreta,
      { expiresIn: '24h' } 
    );

    res.status(200).json({
      message: 'Login exitoso',
      token: token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Hubo un problema al intentar iniciar sesion' });
  }
});
// Ruta Privada: Obtener los datos de mi cuenta
app.get('/api/mi-cuenta', validarToken, async (req: AuthRequest, res: Response) => {
  try {
    // req.usuario.id viene del token decodificado por el middleware
    const cuenta = await Cuenta.findOne({ where: { usuario_id: req.usuario.id } });

    if (!cuenta) {
      res.status(404).json({ error: 'Cuenta no encontrada' });
      return;
    }

    res.status(200).json({
      message: 'Datos de la cuenta obtenidos exitosamente',
      cuenta: {
        cvu: cuenta.cvu,
        alias: cuenta.alias,
        saldo: cuenta.saldo,
        estado: cuenta.estado
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la cuenta' });
  }
});

// Ruta Privada: Transferir dinero a otra cuenta
app.post('/api/transferencias', validarToken, async (req: AuthRequest, res: Response) => {
  // 1. Iniciamos una transaccion segura
  const t = await sequelize.transaction();

  try {
    const { cvu_destino, monto, motivo } = req.body;

    if (!monto || monto <= 0) {
      res.status(400).json({ error: 'El monto debe ser mayor a 0' });
      return;
    }

    // 2. Buscamos la cuenta de quien envia
    const cuentaOrigen = await Cuenta.findOne({ where: { usuario_id: req.usuario.id }, transaction: t });
    if (!cuentaOrigen) {
      res.status(404).json({ error: 'Tu cuenta no fue encontrada' });
      return;
    }

    // 3. Buscamos la cuenta destino usando el CVU
    const cuentaDestino = await Cuenta.findOne({ where: { cvu: cvu_destino }, transaction: t });
    if (!cuentaDestino) {
      res.status(404).json({ error: 'La cuenta destino no existe' });
      return;
    }

    if (cuentaOrigen.id === cuentaDestino.id) {
      res.status(400).json({ error: 'No puedes enviarte dinero a ti mismo de esta forma' });
      return;
    }

    // 4. Verificamos que tengas saldo suficiente
    if (cuentaOrigen.saldo < monto) {
      res.status(400).json({ error: 'Saldo insuficiente' });
      return;
    }

    // 5. Restamos y sumamos
    cuentaOrigen.saldo = Number(cuentaOrigen.saldo) - Number(monto);
    cuentaDestino.saldo = Number(cuentaDestino.saldo) + Number(monto);

    await cuentaOrigen.save({ transaction: t });
    await cuentaDestino.save({ transaction: t });

    // 6. Creamos el comprobante en el historial
    const nuevaTransferencia = await Transferencia.create({
      cuenta_origen_id: cuentaOrigen.id,
      cuenta_destino_id: cuentaDestino.id,
      monto: monto,
      motivo: motivo || 'Varias'
    }, { transaction: t });

    await t.commit();

    res.status(200).json({
      message: 'Transferencia realizada con exito',
      comprobante: nuevaTransferencia
    });

  } catch (error) {
    await t.rollback();
    console.error('Error en transferencia:', error);
    res.status(500).json({ error: 'Hubo un problema al procesar la transferencia' });
  }
});

sequelize.sync({ alter: true }) 
  .then(() => {
    console.log('Base de datos sincronizada correctamente.');
    app.listen(port, () => {
      console.log(`Servidor corriendo en http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Error al sincronizar la base de datos:', error);
  });

  // Ruta Temporal: Cargar saldo para pruebas
app.post('/api/depositar', validarToken, async (req: AuthRequest, res: Response): Promise => {
  try {
    const cuenta = await Cuenta.findOne({ where: { usuario_id: req.usuario.id } });
    if (!cuenta) {
      res.status(404).json({ error: 'Cuenta no encontrada' });
      return;
    }
    
    // Sumamos 10.000 al saldo actual de la cuenta
    cuenta.saldo = Number(cuenta.saldo) + 10000.00;
    await cuenta.save();
    
    res.json({ message: 'Saldo recargado exitosamente', saldo_actual: cuenta.saldo });
  } catch (error) {
    res.status(500).json({ error: 'Error al recargar saldo' });
  }
});