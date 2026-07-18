'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Usuario {
  id: string;
  username: string | null;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  rol: string;
  created_at: string;
}

interface Props {
  usuariosIniciales: Usuario[];
  miId: string;
}

const ROLES = [
  { valor: 'cliente', label: 'Cliente' },
  { valor: 'admin', label: 'Administrador' },
];

const FORM_VACIO = {
  username: '',
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  password: '',
  rol: 'cliente',
};

export default function GestionUsuarios({ usuariosIniciales, miId }: Props) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosIniciales);

  // Reflejar en la tabla los datos frescos del servidor tras router.refresh()
  useEffect(() => {
    setUsuarios(usuariosIniciales);
  }, [usuariosIniciales]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Modal crear/editar
  const [modal, setModal] = useState<null | { modo: 'crear' | 'editar'; id?: string }>(null);
  const [form, setForm] = useState({ ...FORM_VACIO });

  // Modal cambiar contraseña
  const [modalPass, setModalPass] = useState<null | { id: string; nombre: string }>(null);
  const [nuevaPass, setNuevaPass] = useState('');

  const aviso = (tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const abrirCrear = () => {
    setForm({ ...FORM_VACIO });
    setModal({ modo: 'crear' });
  };

  const abrirEditar = (u: Usuario) => {
    setForm({
      username: u.username || '',
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      email: u.email || '',
      telefono: u.telefono || '',
      password: '',
      rol: u.rol === 'admin' ? 'admin' : 'cliente',
    });
    setModal({ modo: 'editar', id: u.id });
  };

  const recargar = () => router.refresh();

  const guardar = async () => {
    setCargando(true);
    try {
      if (modal?.modo === 'crear') {
        const res = await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al crear');
        aviso('ok', '✅ Usuario creado');
      } else if (modal?.modo === 'editar' && modal.id) {
        const res = await fetch(`/api/admin/usuarios/${modal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username,
            nombre: form.nombre,
            apellido: form.apellido,
            email: form.email,
            telefono: form.telefono,
            rol: form.rol,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al editar');

        // Si se ingresó una contraseña nueva, también actualizarla
        if (form.password) {
          if (form.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
          const resp = await fetch(`/api/admin/usuarios/${modal.id}/password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: form.password }),
          });
          const dp = await resp.json();
          if (!resp.ok) throw new Error(dp.error || 'Error al cambiar la contraseña');
        }

        aviso('ok', '✅ Usuario actualizado');
      }
      setModal(null);
      recargar();
    } catch (e: any) {
      aviso('error', `❌ ${e.message}`);
    } finally {
      setCargando(false);
    }
  };

  const cambiarPassword = async () => {
    if (!modalPass) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${modalPass.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nuevaPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar la contraseña');
      aviso('ok', '✅ Contraseña actualizada');
      setModalPass(null);
      setNuevaPass('');
    } catch (e: any) {
      aviso('error', `❌ ${e.message}`);
    } finally {
      setCargando(false);
    }
  };

  const cambiarRolRapido = async (u: Usuario, rol: string) => {
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar el rol');
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, rol } : x)));
      aviso('ok', '✅ Rol actualizado');
    } catch (e: any) {
      aviso('error', `❌ ${e.message}`);
    } finally {
      setCargando(false);
    }
  };

  const eliminar = async (u: Usuario) => {
    if (!confirm(`¿Eliminar al usuario ${u.nombre || u.email}? Esta acción no se puede deshacer.`)) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id));
      aviso('ok', '🗑️ Usuario eliminado');
    } catch (e: any) {
      aviso('error', `❌ ${e.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      {mensaje && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
            mensaje.tipo === 'ok'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600 dark:text-gray-300 text-sm">{usuarios.length} usuario(s)</p>
        <button
          onClick={abrirCrear}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold text-sm"
        >
          ➕ Nuevo usuario
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Usuario</th>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Teléfono</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-200">{u.username || '—'}</td>
                <td className="px-4 py-3 text-gray-800 dark:text-gray-100">
                  {[u.nombre, u.apellido].filter(Boolean).join(' ') || '—'}
                  {u.id === miId && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">vos</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email || '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.telefono || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.rol === 'admin' ? 'admin' : 'cliente'}
                    onChange={(e) => cambiarRolRapido(u, e.target.value)}
                    disabled={cargando || u.id === miId}
                    className={`text-xs font-semibold rounded-full px-2 py-1 border ${
                      u.rol === 'admin'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                    } disabled:opacity-60`}
                    title={u.id === miId ? 'No podés cambiar tu propio rol' : 'Asignar rol'}
                  >
                    {ROLES.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => abrirEditar(u)}
                      className="bg-amber-500 text-white px-3 py-1 rounded hover:bg-amber-600 text-xs font-semibold"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => setModalPass({ id: u.id, nombre: u.nombre || u.email || '' })}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-xs font-semibold"
                    >
                      🔑 Contraseña
                    </button>
                    {u.id !== miId && (
                      <button
                        onClick={() => eliminar(u)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs font-semibold"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">{modal.modo === 'crear' ? '➕ Nuevo usuario' : '✏️ Editar usuario'}</h3>
              <button onClick={() => setModal(null)} className="text-white text-2xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="ej: mgonzalez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Rol</label>
                  <select
                    value={form.rol}
                    onChange={(e) => setForm({ ...form, rol: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={form.apellido}
                    onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {modal.modo === 'crear' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Contraseña</label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}

              {modal.modo === 'editar' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Nueva contraseña <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Dejar vacío para no cambiarla"
                  />
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={cargando}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {cargando ? '⏳ Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cambiar contraseña */}
      {modalPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalPass(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">🔑 Cambiar contraseña</h3>
              <button onClick={() => setModalPass(null)} className="text-white text-2xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">Usuario: <strong>{modalPass.nombre}</strong></p>
              <input
                type="text"
                value={nuevaPass}
                onChange={(e) => setNuevaPass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nueva contraseña (mín. 6)"
              />
              <p className={`text-xs ${nuevaPass.length > 0 && nuevaPass.length < 6 ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'}`}>
                {nuevaPass.length > 0 && nuevaPass.length < 6
                  ? `Faltan ${6 - nuevaPass.length} caracteres (mínimo 6)`
                  : 'La contraseña debe tener al menos 6 caracteres.'}
              </p>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button onClick={() => setModalPass(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600">
                Cancelar
              </button>
              <button
                onClick={cambiarPassword}
                disabled={cargando || nuevaPass.length < 6}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {cargando ? '⏳...' : 'Cambiar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
