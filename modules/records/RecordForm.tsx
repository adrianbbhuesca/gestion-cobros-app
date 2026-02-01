import React, { useState, useRef } from 'react';
import { Upload, Save, X, WifiOff } from 'lucide-react';
import { useUserStore } from '../../store/user.store';
import { useUIStore } from '../../store/ui.store';
import { createRecord } from './records.service';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { createLocalNotification } from '../../services/notification.service';
import { getLocalISODate } from '../../utils/dates';

export const RecordForm: React.FC = () => {
  const { user, accessToken } = useUserStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();
  const context = useOutletContext<{ isOnline: boolean }>();
  const isOnline = context ? context.isOnline : navigator.onLine;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  
  // GOLD STANDARD FIX: Usamos strings para los inputs numéricos.
  // Esto permite escribir "10." sin que React elimine el punto decimal al renderizar
  // y permite borrar el campo completamente (empty string) para mejor UX.
  const [formData, setFormData] = useState({
    fecha: getLocalISODate(),
    cobrado: '', // String inicial vacío o '0'
    ingresado: '',
    observaciones: '',
    type: 'cobro' as 'cobro' | 'ingreso'
  });
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 5 * 1024 * 1024) {
        addToast('El archivo es demasiado grande (Máx 5MB)', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'cobrado' | 'ingresado') => {
    const val = e.target.value;
    // Regex: Permite vacio, números enteros y decimales (hasta 2).
    // Evita caracteres inválidos antes de actualizar el estado.
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
        setFormData({ ...formData, [field]: val });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accessToken) return;

    if (!isOnline) {
        addToast('No hay conexión. No se puede guardar en Drive/Sheets.', 'error');
        return;
    }

    // Conversión segura a números para el envío
    const cobradoNum = parseFloat(formData.cobrado) || 0;
    const ingresadoNum = parseFloat(formData.ingresado) || 0;

    if (cobradoNum <= 0 && ingresadoNum <= 0) {
        addToast('El monto debe ser mayor a 0', 'warning');
        return;
    }

    setLoading(true);
    try {
      // Preparamos el objeto con tipos correctos para el servicio
      const submissionData = {
          ...formData,
          cobrado: cobradoNum,
          ingresado: ingresadoNum
      };

      await createRecord(submissionData, file, user, accessToken);
      addToast(`${formData.type === 'cobro' ? 'Cobro' : 'Ingreso'} registrado exitosamente`, 'success');
      await createLocalNotification(user.uid, 'Registro Exitoso', `Se ha guardado el registro de ${formData.type}`, 'success');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      addToast(`Error: ${err.message || 'Error desconocido'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <span className={`w-3 h-8 rounded-full shadow-lg ${formData.type === 'cobro' ? 'bg-blue-600' : 'bg-green-600'}`}></span>
            Nuevo Registro
          </h1>
          {!isOnline && (
              <span className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full font-bold border border-yellow-200">
                  <WifiOff className="w-4 h-4" /> Offline
              </span>
          )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 space-y-8 relative overflow-hidden">
        {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4 font-semibold text-gray-700 dark:text-gray-300">Sincronizando con Drive y Sheets...</p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tipo de Operación</label>
                <div className="flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1.5 shadow-inner">
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, type: 'cobro', ingresado: ''})}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${formData.type === 'cobro' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Cobro
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, type: 'ingreso', cobrado: ''})}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${formData.type === 'ingreso' ? 'bg-white text-green-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Ingreso
                    </button>
                </div>
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Fecha</label>
                <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {formData.type === 'cobro' ? (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Monto Cobrado</label>
                    <div className="relative">
                        <span className="absolute left-4 top-3 text-gray-500">€</span>
                        <input
                            type="text" 
                            inputMode="decimal"
                            required
                            value={formData.cobrado}
                            onChange={(e) => handleAmountChange(e, 'cobrado')}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-lg font-mono placeholder-gray-400"
                            placeholder="0.00"
                        />
                    </div>
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Monto Ingresado</label>
                    <div className="relative">
                        <span className="absolute left-4 top-3 text-gray-500">€</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            required
                            value={formData.ingresado}
                            onChange={(e) => handleAmountChange(e, 'ingresado')}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 text-lg font-mono placeholder-gray-400"
                            placeholder="0.00"
                        />
                    </div>
                </div>
            )}
        </div>

        <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Evidencia (Imagen)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer relative group">
                <div className="space-y-1 text-center">
                    {preview ? (
                        <div className="relative inline-block">
                            <img src={preview} alt="Preview" className="h-48 rounded-lg shadow-md object-contain" />
                            <button 
                                type="button"
                                onClick={clearFile}
                                className="absolute -top-3 -right-3 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Upload className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                    <span>Sube un archivo</span>
                                    <input 
                                        id="file-upload" 
                                        name="file-upload" 
                                        type="file" 
                                        className="sr-only" 
                                        accept="image/*" 
                                        onChange={handleFileChange}
                                        ref={fileInputRef} 
                                    />
                                </label>
                                <p className="pl-1">o arrastra y suelta</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
                        </>
                    )}
                </div>
            </div>
        </div>

        <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Observaciones</label>
            <textarea
                rows={3}
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-shadow resize-none"
                placeholder="Detalles adicionales..."
            />
        </div>

        <div className="pt-4">
            <button
                type="submit"
                disabled={loading || !isOnline}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-all transform active:scale-[0.98] 
                    ${isOnline 
                        ? (formData.type === 'cobro' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30' : 'bg-green-600 hover:bg-green-700 shadow-green-600/30') 
                        : 'bg-gray-400 cursor-not-allowed'}`}
            >
                {loading ? 'Guardando...' : (
                    <>
                        <Save className="w-5 h-5" />
                        Guardar Registro
                    </>
                )}
            </button>
        </div>
      </form>
    </div>
  );
};