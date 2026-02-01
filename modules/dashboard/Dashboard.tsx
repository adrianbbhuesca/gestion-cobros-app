import { useEffect, useMemo, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase";
import { getAuth } from "firebase/auth";

interface RecordItem {
  id: string;
  tipo: "cobro" | "ingreso";
  concepto: string;
  monto: number;
  fecha: string;
  driveFileUrl?: string;
}

export default function Dashboard() {
  const user = getAuth().currentUser;
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [filter, setFilter] = useState<"todos" | "cobro" | "ingreso">("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const q = query(
        collection(db, "records"),
        where("userId", "==", user.uid),
        orderBy("fecha", "desc")
      );

      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<RecordItem, "id">),
      }));

      setRecords(data);
      setLoading(false);
    };

    load();
  }, [user]);

  const filtered = useMemo(() => {
    if (filter === "todos") return records;
    return records.filter((r) => r.tipo === filter);
  }, [records, filter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        if (r.tipo === "cobro") acc.cobros += r.monto;
        if (r.tipo === "ingreso") acc.ingresos += r.monto;
        return acc;
      },
      { cobros: 0, ingresos: 0 }
    );
  }, [filtered]);

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Filtros */}
      <div className="flex gap-2">
        {["todos", "cobro", "ingreso"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-1 border ${
              filter === f ? "bg-blue-600 text-white" : ""
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border">
          <p>Total Cobros</p>
          <p className="text-xl font-bold">{totals.cobros} €</p>
        </div>
        <div className="p-4 border">
          <p>Total Ingresos</p>
          <p className="text-xl font-bold">{totals.ingresos} €</p>
        </div>
      </div>

      {/* Tabla */}
      <table className="w-full border">
        <thead>
          <tr className="border-b">
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Concepto</th>
            <th>Monto</th>
            <th>Documento</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} className="border-b text-center">
              <td>{r.fecha}</td>
              <td>{r.tipo}</td>
              <td>{r.concepto}</td>
              <td>{r.monto}</td>
              <td>
                {r.driveFileUrl ? (
                  <a
                    href={r.driveFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    Ver
                  </a>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
