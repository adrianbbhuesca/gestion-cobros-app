import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { Check, X, UserX, UserCheck, HardDrive, Shield, Activity, ShieldAlert, ShieldCheck } from 'lucide-react';
import { db } from '../../services/firebase';
import { UserProfile, SystemLog } from '../../types';
import { createLocalNotification, createSystemLog } from '../../services/notification.service';
import { useUserStore } from '../../store/user.store';
import { useUIStore } from '../../store/ui.store';

export const AdminPanel: React.FC = () => {
  const { user: currentUser } = useUserStore();
  const { addToast } = useUIStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Users
      const qUsers = query(collection(db, 'users'));
      const snapUsers = await getDocs(qUsers);
      setUsers(snapUsers.docs.map(d => d.data() as UserProfile));

      // Fetch Logs
      const qLogs = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(50));
      const snapLogs = await getDocs(qLogs);
      setLogs(snapLogs.docs.map(d => ({ id: d.id, ...d.data() } as SystemLog)));
    } catch (e) {
      console.error("Error fetching admin data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (targetUid: string, action: 'approve' | 'block' | 'promote', value: boolean) => {
    if (!currentUser) return;
    if (actionLoading) return; // Prevenir doble click
    
    // Safety Check: Prevenir acciones contra uno mismo
    if (targetUid === currentUser.uid) {
        addToast("No puedes realizar acciones administrativas sobre tu propio usuario.", "warning");
        return;
    }

    setActionLoading(targetUid);
    try {
      const ref = doc(db, 'users', targetUid);
      let updates: Partial<UserProfile> = {};
      let logMsg = '';
      let notifMsg = '';

      if (action === 'approve') {
          updates = { approved: value };
          logMsg = value ? 'Usuario aprobado' : 'Usuario desaprobado';
          notifMsg = value ? 'Tu cuenta ha sido aprobada.' : 'Tu cuenta ha sido desaprobada.';
      } else if (action === 'block') {
          updates = { blocked: value };
          logMsg = value ? 'Usuario bloqueado' : 'Usuario desbloqueado';
          notifMsg = value ? 'Tu cuenta ha sido bloqueada por un administrador.' : 'Tu cuenta ha sido desbloqueada.';
      } else if (action === 'promote') {
          updates = { role: value ? 'admin' : 'user' };
          logMsg = value ? 'Promovido a Admin' : 'Degradado a User';
          notifMsg = value ? 'Se te han otorgado permisos de Administrador.' : 'Se te han revocado los permisos de Administrador.';
      }

      await updateDoc(ref, updates);
      await createLocalNotification(targetUid, 'Actualización de cuenta', notifMsg, value ? 'success' : 'warning');
      await createSystemLog(currentUser.uid, `ADMIN_${action.toUpperCase()}`, `Target: ${targetUid} - ${logMsg}`);
      
      addToast(`Acción ${action} realizada correctamente`, 'success');
      await fetchData();
    } catch (e) {
      console.error("Error performing action", e);
      addToast("Error al realizar la acción", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Administración
        </h1>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button 
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
            >
                Usuarios
            </button>
            <button 
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'logs' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
            >
                Logs del Sistema
            </button>
        </div>
      </div>
      
      {activeTab === 'users' && (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuario</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rol</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Drive</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {users.map((u) => {
                        const isSelf = u.uid === currentUser?.uid;
                        return (
                        <tr key={u.uid} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isSelf ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    {u.photoURL ? (
                                        <img className="h-8 w-8 rounded-full mr-3" src={u.photoURL} alt="" />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full mr-3 bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold">
                                            {u.displayName.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {u.displayName} {isSelf && <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full ml-1">(Tú)</span>}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{u.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                    {u.role}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1 items-start">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.approved ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                    {u.approved ? 'Aprobado' : 'Pendiente'}
                                </span>
                                {u.blocked && (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                        Bloqueado
                                    </span>
                                )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {u.drive ? (
                                    <div className="flex items-center text-green-600 dark:text-green-400 gap-1" title="Drive Conectado">
                                        <HardDrive className="w-4 h-4" /> Activo
                                    </div>
                                ) : (
                                    <span className="text-gray-400 flex items-center gap-1">
                                        <HardDrive className="w-4 h-4" /> Inactivo
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                {/* Botón Aprobar */}
                                <button 
                                    onClick={() => handleAction(u.uid, 'approve', !u.approved)} 
                                    disabled={!!actionLoading || isSelf}
                                    className={`p-1.5 rounded-md transition-colors ${actionLoading || isSelf ? 'opacity-30 cursor-not-allowed' : ''} ${u.approved ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                    title={u.approved ? 'Desaprobar Acceso' : 'Aprobar Acceso'}
                                >
                                    {u.approved ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                                </button>
                                
                                {/* Botón Bloquear */}
                                <button 
                                    onClick={() => handleAction(u.uid, 'block', !u.blocked)} 
                                    disabled={!!actionLoading || isSelf}
                                    className={`p-1.5 rounded-md transition-colors ${actionLoading || isSelf ? 'opacity-30 cursor-not-allowed' : ''} ${u.blocked ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                    title={u.blocked ? 'Desbloquear Usuario' : 'Bloquear Usuario'}
                                >
                                    {u.blocked ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                                </button>
                                
                                {/* Botón Admin */}
                                <button 
                                    onClick={() => handleAction(u.uid, 'promote', u.role !== 'admin')} 
                                    disabled={!!actionLoading || isSelf}
                                    className={`p-1.5 rounded-md transition-colors ${actionLoading || isSelf ? 'opacity-30 cursor-not-allowed' : ''} ${u.role === 'admin' ? 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    title={u.role === 'admin' ? 'Revocar Admin' : 'Hacer Admin'}
                                >
                                    {u.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                                </button>
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
      </div>
      )}

      {activeTab === 'logs' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Actividad del Sistema (Últimos 50)</h3>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                  {logs.map((log) => (
                      <li key={log.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                          <div className="flex justify-between">
                              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{log.action}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{log.details}</p>
                          <p className="mt-0.5 text-xs text-gray-400">Admin ID: {log.userId}</p>
                      </li>
                  ))}
                  {logs.length === 0 && (
                      <li className="px-6 py-8 text-center text-gray-500 text-sm">No hay registros de actividad.</li>
                  )}
              </ul>
          </div>
      )}
    </div>
  );
};