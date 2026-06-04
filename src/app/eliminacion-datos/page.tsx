import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eliminación de datos — Vertex",
  description: "Cómo solicitar la eliminación de tus datos del asistente de pedidos de WhatsApp.",
};

const ACTUALIZADO = "3 de junio de 2026";

export default function EliminacionDatosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-foreground">
      <h1 className="font-[family-name:var(--font-bricolage)] text-3xl font-bold">Eliminación de datos</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última actualización: {ACTUALIZADO}</p>

      <div className="mt-8 space-y-6 leading-relaxed">
        <section className="space-y-2">
          <p>
            Si usaste nuestro asistente de pedidos por WhatsApp y quieres que eliminemos tus datos (tu número, los
            mensajes y la conversación del pedido), puedes solicitarlo de cualquiera de estas formas:
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Cómo solicitar la eliminación</h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              Escribe la palabra <strong>ELIMINAR</strong> por el mismo WhatsApp donde haces tus pedidos, o
            </li>
            <li>
              Envíanos un correo a{" "}
              <a className="text-primary underline" href="mailto:contacto@appvertex.shop">contacto@appvertex.shop</a>{" "}
              desde el número/cuenta que quieres eliminar, indicando tu número de teléfono.
            </li>
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Qué eliminamos y en cuánto tiempo</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Tu número de teléfono y el contenido de los mensajes/conversaciones del asistente.</li>
            <li>El borrador de pedidos en curso asociado a tu número.</li>
          </ul>
          <p>
            Procesamos la solicitud en un plazo máximo de <strong>30 días</strong>. Ten en cuenta que algunos registros
            de pedidos ya facturados pueden conservarse de forma limitada cuando la ley (por ejemplo, obligaciones
            contables o tributarias) así lo exige; en ese caso se conservan solo los datos estrictamente necesarios.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Contacto</h2>
          <p>
            ¿Dudas? Escríbenos a{" "}
            <a className="text-primary underline" href="mailto:contacto@appvertex.shop">contacto@appvertex.shop</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
