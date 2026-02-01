import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { initDriveForRecord } from "../../services/drive.service";
import { useAuth } from "../../auth/AuthContext";

export default function NewRecord() {
  const { user } = useAuth();

  const [tipo, setTipo] = useState<"cobro" | "ingreso" | "">("");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!tipo || !concepto || !monto || !fecha) {
      alert("Todos los campos son obligatorios");
      return;
    }

    const docRef = await addDoc(collection(db, "records"), {
      tipo,
      concepto,
      monto: Number(monto),
      diferencia: Number(monto),
      fecha: new Date(fecha),
      userId: user!.uid,
      createdAt: serverTimestamp()
    });

    // 🔥 Crear estructura en Drive
    const driveData = await initDriveForRecord(tipo, docRef.id);

    // Guardar IDs de Drive
    await docRef.update({
      drive: driveData
    });

    alert("Registro creado correctamente");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Nuevo Registro</h2>

      <select value={tipo} onChange={e => setTipo(e.target.value as any)} required>
        <option value="">Seleccionar tipo</option>
        <option value="cobro">Cobro</option>
        <option value="ingreso">Ingreso</option>
      </select>

      <input
        placeholder="Concepto"
        value={concepto}
        onChange={e => setConcepto(e.target.value)}
      />

      <input
        type="number"
        placeholder="Monto"
        value={monto}
        onChange={e => setMonto(e.target.value)}
      />

      <input
        type="date"
        value={fecha}
        onChange={e => setFecha(e.target.value)}
      />

      <button type="submit">Guardar</button>
    </form>
  );
}
