export type RecordType = "cobro" | "ingreso";

export interface Record {
  id: string;
  tipo: RecordType;
  fecha: Date;
  concepto: string;
  monto: number;
  diferencia: number;
  userId: string;
  createdAt: Date;
  drive?: {
    carpetaId: string;
    imagenId?: string;
    imagenUrl?: string;
  };
}
