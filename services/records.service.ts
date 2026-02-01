import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface RecordInput {
  tipo: "cobro" | "ingreso";
  monto: number;
  fecha: string;
  descripcion?: string;
  driveFolderId?: string | null;
  driveFileId?: string | null;
}

export const createRecord = async (
  userId: string,
  data: RecordInput
) => {
  await addDoc(collection(db, "records"), {
    userId,
    ...data,
    createdAt: serverTimestamp(),
  });
};
