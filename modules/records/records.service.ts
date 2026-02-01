import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { RecordData, UserProfile } from '../../types';
import { uploadFileToDrive } from '../../services/drive.service';
import { appendRowToSheet } from '../../services/sheets.service';

export const createRecord = async (
  recordInput: Omit<RecordData, 'id' | 'userId' | 'diferencia' | 'userName'>,
  file: File | null,
  user: UserProfile,
  accessToken: string
) => {
  if (!user.drive) throw new Error('Usuario no tiene configurado Drive');

  const diferencia = recordInput.cobrado - recordInput.ingresado;
  let imageUrl = '';
  let fileId = '';

  // 1. Subir imagen a Drive si existe
  if (file) {
    const folderId = recordInput.type === 'cobro' ? user.drive.cobrosId : user.drive.ingresosId;
    const uploaded = await uploadFileToDrive(accessToken, file, folderId);
    fileId = uploaded.id;
    imageUrl = uploaded.link;
  }

  const finalRecord: RecordData = {
    ...recordInput,
    diferencia,
    userId: user.uid,
    userName: user.displayName,
    imageUrl,
    fileId,
    createdAt: new Date().toISOString()
  };

  // 2. Guardar en Firestore
  await addDoc(collection(db, 'records'), finalRecord);

  // 3. Añadir fila al Sheet
  await appendRowToSheet(accessToken, user.drive.sheetId, finalRecord);

  return finalRecord;
};