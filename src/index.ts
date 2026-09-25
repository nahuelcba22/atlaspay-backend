import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { sequelize } from './db';
import { Op } from 'sequelize'; 
import { Usuario } from './models/Usuario';
import { Cuenta } from './models/Cuenta';
import { Transferencia } from './models/Transferencia';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validarToken } from './middlewares/validarToken';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req: any, res: any) => {
  res.status(200).json({ message: 'Servidor de Atlaspay funcionando correctamente' });
});

// Ruta de Register
app.post('/api/usuarios', async (req: any, res: any) => {
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
        usuario: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre, email: nuevoUsuario.email },
        cuenta: { cvu: nuevaCuenta.cvu, alias: nuevaCuenta.alias, saldo: nuevaCuenta.saldo }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Hubo un problema al crear el usuario y la cuenta' });
  }
});

// Ruta para Login 
app.post('/api/login', async (req: any, res: any) => {
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

    const firmaSecreta = process.env.JWT_SECRET || 'clave_super_secreta_de_desarrollo';
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      firmaSecreta,
      { expiresIn: '24h' } 
    );

    res.status(200).json({
      message: 'Login exitoso',
      token: token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Hubo un problema al intentar iniciar sesion' });
  }
});

// Ruta Privada: Obtener los datos de mi cuenta
app.get('/api/mi-cuenta', validarToken, async (req: any, res: any) => {
  try {
    const cuenta = await Cuenta.findOne({ where: { usuario_id: req.usuario.id } });
    if (!cuenta) {
      res.status(404).json({ error: 'Cuenta no encontrada' });
      return;
    }
    res.status(200).json({
      message: 'Datos de la cuenta obtenidos exitosamente',
      cuenta: { cvu: cuenta.cvu, alias: cuenta.alias, saldo: cuenta.saldo, estado: cuenta.estado }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la cuenta' });
  }
});

// Ruta Privada: Historial de transferencias
app.get('/api/transferencias', validarToken, async (req: any, res: any) => {
  try {
    const cuenta = await Cuenta.findOne({ where: { usuario_id: req.usuario.id } });
    if (!cuenta) {
      res.status(404).json({ error: 'Cuenta no encontrada' });
      return;
    }

    const transferencias = await Transferencia.findAll({
      where: {
        [Op.or]: [
          { cuenta_origen_id: cuenta.id },
          { cuenta_destino_id: cuenta.id }
        ]
      },
      order: [['fecha', 'DESC']]
    });

    res.status(200).json({ message: 'Historial obtenido con exito', transferencias });
  } catch (error) {
    console.error('Error al obtener el historial:', error);
    res.status(500).json({ error: 'Hubo un problema al consultar el historial' });
  }
});

// Ruta Privada: Transferir dinero a otra cuenta
app.post('/api/transferencias', validarToken, async (req: any, res: any) => {
  const t = await sequelize.transaction();
  try {
    const { cvu_destino, monto, motivo } = req.body;
    const usuarioId = req.usuario.id;

    if (!monto || monto <= 0) {
      res.status(400).json({ error: 'El monto debe ser mayor a 0' });
      return;
    }

    const cuentaOrigen = await Cuenta.findOne({ where: { usuario_id: usuarioId }, transaction: t });
    if (!cuentaOrigen) {
      res.status(404).json({ error: 'Tu cuenta no fue encontrada' });
      return;
    }

    const cuentaDestino = await Cuenta.findOne({ where: { cvu: cvu_destino }, transaction: t });
    if (!cuentaDestino) {
      res.status(404).json({ error: 'La cuenta destino no existe' });
      return;
    }

    if (cuentaOrigen.id === cuentaDestino.id) {
      res.status(400).json({ error: 'No puedes enviarte dinero a ti mismo de esta forma' });
      return;
    }

    if (cuentaOrigen.saldo < monto) {
      res.status(400).json({ error: 'Saldo insuficiente' });
      return;
    }

    cuentaOrigen.saldo = Number(cuentaOrigen.saldo) - Number(monto);
    cuentaDestino.saldo = Number(cuentaDestino.saldo) + Number(monto);

    await cuentaOrigen.save({ transaction: t });
    await cuentaDestino.save({ transaction: t });

    const nuevaTransferencia = await Transferencia.create({
      cuenta_origen_id: cuentaOrigen.id,
      cuenta_destino_id: cuentaDestino.id,
      monto: monto,
      motivo: motivo || 'Varias'
    }, { transaction: t });

    await t.commit();

    res.status(200).json({ message: 'Transferencia realizada con exito', comprobante: nuevaTransferencia });
  } catch (error) {
    await t.rollback();
    console.error('Error en transferencia:', error);
    res.status(500).json({ error: 'Hubo un problema al procesar la transferencia' });
  }
});

// Sincronización y arranque
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