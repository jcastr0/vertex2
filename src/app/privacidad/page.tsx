import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad — Vertex",
  description: "Cómo Vertex trata los datos de los clientes que hacen pedidos por WhatsApp.",
};

const ACTUALIZADO = "3 de junio de 2026";

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-foreground">
      <h1 className="font-[family-name:var(--font-bricolage)] text-3xl font-bold">Política de privacidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última actualización: {ACTUALIZADO}</p>

      <div className="mt-8 space-y-6 leading-relaxed">
        <section className="space-y-2">
          <p>
            Vertex es una plataforma de gestión para distribuidoras y comercios. A través de ella, una empresa puede
            ofrecer a sus clientes un asistente para hacer pedidos por WhatsApp. Esta política explica qué datos se
            tratan cuando un cliente escribe a ese asistente y para qué se usan.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Datos que recopilamos</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Tu número de teléfono de WhatsApp y el nombre de perfil que WhatsApp comparte.</li>
            <li>El contenido de los mensajes que envías al asistente (texto e imágenes), para entender tu pedido.</li>
            <li>Los pedidos que realizas y su historial con el comercio.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Para qué usamos tus datos</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Recibir, entender y registrar tus pedidos.</li>
            <li>Confirmarte el pedido y coordinar su preparación y despacho con el comercio.</li>
            <li>Recordar tus compras anteriores para agilizar futuros pedidos (p. ej. “lo de siempre”).</li>
          </ul>
          <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Con quién se comparten</h2>
          <p>Para prestar el servicio, tus datos pueden ser tratados por:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Meta / WhatsApp:</strong> es el canal por el que envías y recibes los mensajes.</li>
            <li><strong>Proveedor de inteligencia artificial (Anthropic):</strong> el texto o la imagen de tu pedido se procesa para interpretar qué productos y cantidades pides.</li>
            <li><strong>Proveedores de infraestructura</strong> (alojamiento y base de datos) que almacenan la información de forma segura.</li>
            <li>El <strong>comercio</strong> al que le haces el pedido, que ve tu solicitud para atenderla.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Conservación y seguridad</h2>
          <p>
            Conservamos tus datos el tiempo necesario para atender tus pedidos y cumplir obligaciones legales y
            contables. La información se protege con medidas de seguridad razonables (cifrado en tránsito y control de
            acceso).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Tus derechos</h2>
          <p>
            Puedes solicitar acceder, corregir o eliminar tus datos. Para eliminarlos, consulta nuestra{" "}
            <a className="text-primary underline" href="/eliminacion-datos">página de eliminación de datos</a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Contacto</h2>
          <p>
            Si tienes dudas sobre esta política o sobre tus datos, escríbenos a{" "}
            <a className="text-primary underline" href="mailto:contacto@appvertex.shop">contacto@appvertex.shop</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
