/**
 * Catálogo de entidades financieras de Colombia (vx36_bancos).
 *
 * Fuente única para sembrar el maestro de bancos. Se usa para que en las
 * cuentas (propias y de beneficiario) el banco se ELIJA de esta lista en vez
 * de escribirse a mano — así no hay "Bancolombia SA / Bancolmbia S".
 *
 * `codigo` es un slug estable (no cambiar una vez sembrado). `nombre` es la
 * forma canónica que se guarda en las cuentas. `tipo` agrupa visualmente.
 * El orden de este arreglo define el orden de aparición (los más comunes
 * primero).
 */
export interface BancoSemilla {
  codigo: string;
  nombre: string;
  tipo: "banco" | "billetera" | "cooperativa" | "financiera";
}

export const BANCOS_CO: BancoSemilla[] = [
  // Billeteras / monederos — lo más usado en el mercado popular
  { codigo: "nequi", nombre: "Nequi", tipo: "billetera" },
  { codigo: "daviplata", nombre: "Daviplata", tipo: "billetera" },
  { codigo: "movii", nombre: "Movii", tipo: "billetera" },
  { codigo: "dale", nombre: "Dale", tipo: "billetera" },
  { codigo: "rappipay", nombre: "RappiPay", tipo: "billetera" },
  { codigo: "nu", nombre: "Nu", tipo: "billetera" },
  { codigo: "uala", nombre: "Ualá", tipo: "billetera" },
  { codigo: "powwi", nombre: "Powwi", tipo: "billetera" },

  // Bancos
  { codigo: "bancolombia", nombre: "Bancolombia", tipo: "banco" },
  { codigo: "banco-bogota", nombre: "Banco de Bogotá", tipo: "banco" },
  { codigo: "davivienda", nombre: "Davivienda", tipo: "banco" },
  { codigo: "bbva", nombre: "BBVA Colombia", tipo: "banco" },
  { codigo: "banco-occidente", nombre: "Banco de Occidente", tipo: "banco" },
  { codigo: "banco-popular", nombre: "Banco Popular", tipo: "banco" },
  { codigo: "banco-agrario", nombre: "Banco Agrario de Colombia", tipo: "banco" },
  { codigo: "banco-caja-social", nombre: "Banco Caja Social", tipo: "banco" },
  { codigo: "scotiabank-colpatria", nombre: "Scotiabank Colpatria", tipo: "banco" },
  { codigo: "itau", nombre: "Itaú", tipo: "banco" },
  { codigo: "banco-av-villas", nombre: "Banco AV Villas", tipo: "banco" },
  { codigo: "banco-gnb-sudameris", nombre: "Banco GNB Sudameris", tipo: "banco" },
  { codigo: "banco-falabella", nombre: "Banco Falabella", tipo: "banco" },
  { codigo: "banco-pichincha", nombre: "Banco Pichincha", tipo: "banco" },
  { codigo: "bancoomeva", nombre: "Bancoomeva", tipo: "banco" },
  { codigo: "banco-serfinanza", nombre: "Banco Serfinanza", tipo: "banco" },
  { codigo: "coopcentral", nombre: "Banco Cooperativo Coopcentral", tipo: "banco" },
  { codigo: "lulo-bank", nombre: "Lulo Bank", tipo: "banco" },
  { codigo: "banco-finandina", nombre: "Banco Finandina", tipo: "banco" },
  { codigo: "banco-w", nombre: "Banco W", tipo: "banco" },
  { codigo: "bancamia", nombre: "Bancamía", tipo: "banco" },
  { codigo: "banco-mundo-mujer", nombre: "Banco Mundo Mujer", tipo: "banco" },
  { codigo: "banco-contactar", nombre: "Banco Contactar", tipo: "banco" },
  { codigo: "banco-union", nombre: "Banco Unión", tipo: "banco" },
  { codigo: "banco-santander", nombre: "Banco Santander de Negocios Colombia", tipo: "banco" },
  { codigo: "banco-btg-pactual", nombre: "Banco BTG Pactual", tipo: "banco" },
  { codigo: "citibank", nombre: "Citibank Colombia", tipo: "banco" },
  { codigo: "banco-jp-morgan", nombre: "Banco JP Morgan Colombia", tipo: "banco" },

  // Financieras
  { codigo: "coltefinanciera", nombre: "Coltefinanciera", tipo: "financiera" },
  { codigo: "tuya", nombre: "Tuya", tipo: "financiera" },
  { codigo: "crezcamos", nombre: "Crezcamos", tipo: "financiera" },
  { codigo: "financiera-juriscoop", nombre: "Financiera Juriscoop", tipo: "financiera" },

  // Cooperativas
  { codigo: "confiar", nombre: "Confiar Cooperativa Financiera", tipo: "cooperativa" },
  { codigo: "cotrafa", nombre: "Cotrafa Cooperativa Financiera", tipo: "cooperativa" },
  { codigo: "coofinep", nombre: "Coofinep Cooperativa Financiera", tipo: "cooperativa" },
  { codigo: "cfa", nombre: "CFA Cooperativa Financiera", tipo: "cooperativa" },
  { codigo: "coop-fin-antioquia", nombre: "Cooperativa Financiera de Antioquia", tipo: "cooperativa" },
];
