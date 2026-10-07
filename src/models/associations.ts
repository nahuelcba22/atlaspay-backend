import { Cuenta } from './Cuenta';
import { Transferencia } from './Transferencia';

// Relaciones para la cuenta que envía el dinero
Cuenta.hasMany(Transferencia, {
  as: 'transferenciasEnviadas',
  foreignKey: 'cuenta_origen_id',
});
Transferencia.belongsTo(Cuenta, {
  as: 'cuentaOrigen',
  foreignKey: 'cuenta_origen_id',
});

// Relaciones para la cuenta que recibe el dinero
Cuenta.hasMany(Transferencia, {
  as: 'transferenciasRecibidas',
  foreignKey: 'cuenta_destino_id',
});
Transferencia.belongsTo(Cuenta, {
  as: 'cuentaDestino',
  foreignKey: 'cuenta_destino_id',
});
