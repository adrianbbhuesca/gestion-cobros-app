import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit, getAggregateFromServer, sum } from 'firebase/firestore';
import { Download, TrendingUp, TrendingDown, AlertCircle, Search, X, ExternalLink, Calendar, Filter, Database, ArrowRight } from 'lucide-react';
import { db } from '../../services/firebase';
import { useUserStore } from '../../store/user.store';
import { RecordData } from '../../types';
import { formatCurrency, formatDate, getLocalISODate } from '../../utils/dates';
import { getExportUrl } from '../../services/sheets.service';
import { useUIStore } from '../../store/ui.store';

interface StatCardProps {
    title: string;
    amount: number;
    color: 'blue' | 'green' | 'red' | 'gray';
    icon: React.ReactNode;
    isAlert?: boolean;
}

export const Dashboard: React.FC = () => {
  const { user } = useUserStore();
  const { addToast } = useUIStore();
  
  // Filtros: Inicializar correctamente con hora local usando la utilidad centralizada
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: getLocalISODate(firstDay),
      end: getLocalISODate(now)
    };
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Estado de Datos
  const [stats, setStats] = useState({ totalCobrado: 0, totalIngresado: 0, totalDiferencia: 0 });
  const [allRecords, setAllRecords] = useState<RecordData[]>([]); 
  const [loading, setLoading] = useState(true);
  const [indexErrorLink, setIndexErrorLink] = useState<string | null>(null);
  
  // Estado Modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    setIndexErrorLink(null);

    try {
      const recordsRef = collection(db, 'records');
      
      const constraints = [
        where('fecha', '>=', dateRange.start),
        where('fecha', '<=', dateRange.end)
      ];

      if (user.role !== 'admin') {
        constraints.push(where('userId', '==', user.uid));
      }

      const baseQuery = query(recordsRef, ...constraints);

      // 1. Agregaciones (Server-Side)
      const snapshotAgg = await getAggregateFromServer(baseQuery, {
        totalCobrado: sum('cobrado'),
        totalIngresado: sum('ingresado'),
        totalDiferencia: sum('diferencia')
      });

      const dataAgg = snapshotAgg.data();
      setStats({
        totalCobrado: dataAgg.totalCobrado || 0,
        totalIngresado: dataAgg.totalIngresado || 0,
        totalDiferencia: dataAgg.totalDiferencia || 0
      });

      // 2. Lista de Registros (Limitada a 100 por performance)
      const qList = query(baseQuery, orderBy('fecha', 'desc'), limit(100));
      const querySnapshot = await getDocs(qList);
      
      const recs: RecordData[] = [];
      querySnapshot.forEach((doc) => {
        recs.push({ id: doc.id, ...doc.data() } as RecordData);
      });
      setAllRecords(recs);

    } catch (error: any) {
      console.error("Error Dashboard:", error);
      if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
        // TECH LEAD MAGIC: Extraer el enlace de creación de índice del mensaje de error
        const match = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        if (match) {
            setIndexErrorLink(match[0]);
            addToast("Se requiere configuración en la base de datos.", 'warning');
        } else {
            addToast("Falta índice en Firestore. Revisa la consola.", 'warning');
        }
      } else {
        addToast("Error cargando datos financieros.", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, dateRange]);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return allRecords;
    const lower = searchTerm.toLowerCase();
    return allRecords.filter(r => 
      r.observaciones.toLowerCase().includes(lower) ||
      r.userName.toLowerCase().includes(lower) ||
      r.type.toLowerCase().includes(lower)
    );
  }, [allRecords, searchTerm]);

  if (loading && allRecords.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      
      {/* Banner de Error de Índice (Setup Helper) */}
      {indexErrorLink && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r shadow-md animate-fade-in-down">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <Database className="h-5 w-5 text-yellow-600" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-bold text-yellow-800">
                        Configuración de Base de Datos Necesaria
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                        <p>
                            Firebase necesita crear un índice nuevo para soportar los filtros de fecha actuales.
                            Esto es normal la primera vez que combinas ciertos filtros.
                        </p>
                    </div>
                    <div className="mt-4">
                        <a
                            href={indexErrorLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                            Crear Índice Automáticamente <ArrowRight className="ml-2 -mr-1 h-4 w-4" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex-1 w-full">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
                {user?.role === 'admin' ? 'Panel Global' : 'Mis Finanzas'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-4">
                Monitor de rendimiento financiero y auditoría.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Fechas */}
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange(p => ({...p, start: e.target.value}))}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange(p => ({...p, end: e.target.value}))}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Buscador Texto */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar usuario, obs..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
        </div>

        {user?.drive?.sheetId && (
          <a 
            href={getExportUrl(user.drive.sheetId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-full xl:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl transition-all shadow-md hover:shadow-lg font-semibold text-sm"
          >
            <Download className="w-4 h-4" /> Exportar Excel
          </a>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <StatCard 
            title="Total Cobrado" 
            amount={stats.totalCobrado} 
            color="blue" 
            icon={<TrendingUp className="w-5 h-5" />} 
        />
        <StatCard 
            title="Total Ingresado" 
            amount={stats.totalIngresado} 
            color="green" 
            icon={<TrendingDown className="w-5 h-5" />}
        />
        <StatCard 
            title="Diferencia (Periodo)" 
            amount={stats.totalDiferencia} 
            color={stats.totalDiferencia !== 0 ? 'red' : 'gray'} 
            icon={<AlertCircle className="w-5 h-5" />}
            isAlert={stats.totalDiferencia !== 0}
        />
      </div>

      {/* Advanced Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Registros Filtrados ({filteredRecords.length})</h3>
          </div>
          {loading && <span className="text-xs text-blue-600 animate-pulse font-medium">Actualizando...</span>}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 whitespace-nowrap">Fecha</th>
                {user?.role === 'admin' && <th className="px-6 py-3">Usuario</th>}
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3 text-right">Cobrado</th>
                <th className="px-6 py-3 text-right">Ingresado</th>
                <th className="px-6 py-3 text-right">Diferencia</th>
                <th className="px-6 py-3">Observaciones</th>
                <th className="px-6 py-3 text-center">Evidencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="bg-white dark:bg-gray-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatDate(rec.fecha)}</td>
                  {user?.role === 'admin' && (
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          <div className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-white text-xs">{rec.userName}</span>
                              <span className="text-[10px] text-gray-400 font-mono">ID: ...{rec.userId.slice(-4)}</span>
                          </div>
                      </td>
                  )}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${rec.type === 'cobro' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'}`}>
                        {rec.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatCurrency(rec.cobrado)}</td>
                  <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatCurrency(rec.ingresado)}</td>
                  <td className={`px-6 py-4 text-right font-mono font-bold whitespace-nowrap ${rec.diferencia !== 0 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-2' : 'text-gray-400'}`}>
                    {formatCurrency(rec.diferencia)}
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-gray-500 text-xs" title={rec.observaciones}>
                    {rec.observaciones || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {rec.imageUrl ? (
                        <button 
                            onClick={() => setSelectedImage(rec.imageUrl!)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 rounded px-2 py-1 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 hover:shadow-sm transition-all"
                        >
                            <Search className="w-3 h-3" /> Ver
                        </button>
                    ) : (
                        <span className="text-gray-300 text-[10px] italic">No Image</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && !indexErrorLink && (
                <tr>
                    <td colSpan={user?.role === 'admin' ? 8 : 7} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                            <Search className="w-8 h-8 text-gray-300" />
                            <p>No se encontraron registros para los filtros seleccionados.</p>
                        </div>
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
            onClick={() => setSelectedImage(null)}
        >
            <div className="relative max-w-5xl w-full max-h-[95vh] flex flex-col items-center">
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors p-2 bg-white/10 rounded-full hover:bg-white/20"
                >
                    <X className="w-6 h-6" />
                </button>
                <div className="bg-white rounded-lg p-1 shadow-2xl overflow-hidden">
                    <img 
                        src={selectedImage} 
                        alt="Comprobante" 
                        className="max-w-full max-h-[85vh] object-contain"
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
                <div className="mt-6 flex gap-4">
                     <a 
                        href={selectedImage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white text-gray-900 px-6 py-2.5 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                     >
                        <ExternalLink className="w-4 h-4" /> Abrir Original en Drive
                     </a>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ title, amount, color, icon, isAlert }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
        green: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
        red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
        gray: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
    };
    return (
        <div className={`p-6 rounded-2xl border ${colors[color]} relative overflow-hidden transition-all hover:shadow-md hover:scale-[1.01]`}>
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">{title}</p>
                    <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight font-mono">{formatCurrency(amount)}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur-sm shadow-sm ${isAlert ? 'animate-pulse' : ''}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};