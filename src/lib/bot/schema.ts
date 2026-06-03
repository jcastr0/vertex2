import { z } from "zod";

/**
 * Salida estructurada que se le pide a Claude. `productoId` es el id del catálogo
 * que se le pasó en el prompt; `null` si no encontró un producto que calce.
 * `nombre` es lo que el cliente pidió (sirve para el resumen y los no reconocidos).
 */
export const salidaItemSchema = z.object({
  productoId: z.number().int().nullable(),
  nombre: z.string(),
  cantidad: z.number().positive(),
});

export const salidaPedidoSchema = z.object({
  items: z.array(salidaItemSchema),
  mensajeAsistente: z.string(),
  completo: z.boolean(),
  notas: z.string().optional(),
});

export type SalidaItem = z.infer<typeof salidaItemSchema>;
export type SalidaPedido = z.infer<typeof salidaPedidoSchema>;
