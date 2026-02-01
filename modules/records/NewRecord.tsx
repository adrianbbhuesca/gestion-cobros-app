import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import {
  getOrCreateDriveFolder,
  uploadFileToDrive,
} from "@/services/drive.service";
import { getAuth } from "firebase/auth";

export default function NewRecord() {
  const auth = getAuth();
  const user = auth.currentUser;

  const [tipo, setTipo] = useState<"cobro" | "ingreso">("cobro");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let driveFileId: string | undefined;
      let driveFileUrl: string | undefined;

      // 🔹 Subida opcional a Drive
      if (file) {
        const folderId = await getOrCreateDriveFolder(tipo);
        const uploaded = await uploadFileToDrive(file, folderId);
        driveFileId = uploaded.file
