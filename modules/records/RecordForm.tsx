import { useState } from "react";
import { initGoogleDrive, createFolder, uploadFile } from "../../services/drive.service";
import { createRecord } from "../../services/records.service";
import { useAuth } from "../../auth/useAuth";

export default function RecordForm() {
  const { user } = useAuth();

  const [tipo, setTipo] = useState<"cobro" | "ingreso">("cobro");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    let driveFolderId: string | null = null;
    let driveFileId: string | null = null;

    try {
      if (imagen) {
        await initGoogleDrive();

        // Carpeta raíz
        const rootFolder = await createFolder("Sistema-Cobros");

        // Carpeta tipo (Cobros / Ingresos)
        const tipoFolder = await createFolder(
          tipo === "cobro" ? "Cobros" : "Ingresos",
          rootFolder
        );

        // Carpeta del registro
        const recordFolder = await createFolder(
          `${fecha}_${descripcion || tipo}`,
          tipoFolder
        );

        driveFolderId = recordFolder;
        driveFileId = await uploadFile(imagen, recordFolder);
      }

      await createRecord(user.uid, {
        tipo,
        monto: Number(monto),
        fecha,
        descripcion,
        driveFolderId,
        driveFileId,
      });

      alert("Registro guardado correctamente");
      setMonto("");
      setFecha("");
      setDescripcion("");
      setImagen(null);

    } catch (err) {
      console.error(err);
      alert("Error al guardar el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Nuevo Registro</h2>

      <select value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
        <option value="cobro">Cobro</option>
        <option value="ingreso">Ingreso</option>
      </select>

      <input
        type="number"
        placeholder="Monto"
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        required
      />

      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Descripción (opcional)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImagen(e.target.files?.[0] || null)}
      />

      <button disabled={loading}>
        {loading ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
