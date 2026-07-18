'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function CrearGrupoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Datos del cliente
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [logueado, setLogueado] = useState(false);

  // Datos del grupo
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Resultado
  const [grupoCreado, setGrupoCreado] = useState<any>(null);
  const [copiadoMsg, setCopiadoMsg] = useState(false);

  // Precargar datos del usuario logueado y saltear el paso de datos
  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, telefono')
        .eq('id', user.id)
        .single();

      setNombre(profile?.nombre || '');
      setEmail(user.email || '');
      setTelefono(profile?.telefono || '');
      setClienteId(user.id);
      setLogueado(true);
      setStep(2); // saltar "Tus datos"
    })();
  }, []);

  // Fecha mínima: hoy + 10 días
  const fechaMinima = new Date();
  fechaMinima.setDate(fechaMinima.getDate() + 10);
  const fechaMinimaStr = fechaMinima.toISOString().split('T')[0];

  const handleCrearGrupo = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Validaciones
      if (!nombre || !email) {
        throw new Error('Nombre y email son obligatorios');
      }
      
      if (!fechaInicio || !fechaFin) {
        throw new Error('Debés seleccionar las fechas');
      }
      
      const fechaIni = new Date(fechaInicio);
      const fechaFn = new Date(fechaFin);
      const diasDiferencia = Math.ceil((fechaFn.getTime() - fechaIni.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diasDiferencia > 30) {
        throw new Error('El plan no puede exceder los 30 días');
      }
      
      // Usar el id del usuario logueado; si no, generar uno local
      const cid = clienteId || crypto.randomUUID();
      
      // Guardar cliente en localStorage para usar después
      localStorage.setItem('cliente_actual', JSON.stringify({
        id: cid,
        nombre,
        email,
        telefono
      }));
      
      // Llamar a la API
      const response = await fetch('/api/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cid,
          restaurante_id: '2fb337bf-301e-4ab2-8179-da9c80cb1e2f',
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          nombre_cliente: nombre,
          email_cliente: email
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el grupo');
      }
      
      setGrupoCreado(data.grupo);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="bg-gradient-to-r from-amber-700 to-orange-600 text-white py-6">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-bold font-serif">👑 Crear un Grupo</h1>
          <p className="text-amber-100 mt-1">
            {logueado ? `Paso ${step - 1} de 2` : `Paso ${step} de 3`}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Progreso */}
        <div className="flex justify-between mb-8">
          {(logueado ? [2, 3] : [1, 2, 3]).map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 mx-1 rounded-full ${
                s <= step ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Paso 1: Datos personales */}
        {step === 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Tus datos</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Ej: María González"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="maria@ejemplo.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={() => {
                if (!nombre || !email) {
                  setError('Nombre y email son obligatorios');
                  return;
                }
                setError('');
                setStep(2);
              }}
              className="w-full mt-6 bg-amber-500 text-white font-bold py-3 rounded-lg hover:bg-amber-600 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Paso 2: Fechas */}
        {step === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Fechas del plan</h2>
            
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded">
              <p className="text-amber-800">
                ⏰ Los pedidos deben hacerse con al menos <strong>10 días de anticipación</strong>.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Fecha de inicio (mínimo {fechaMinima.toLocaleDateString('es-AR')})
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  min={fechaMinimaStr}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Fecha de fin (máximo 30 días)
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  min={fechaInicio || fechaMinimaStr}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              {fechaInicio && fechaFin && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-green-800 font-semibold">
                    📅 Plan de {Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24))} días
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {!logueado && (
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-300"
                >
                  ← Atrás
                </button>
              )}
              <button
                onClick={handleCrearGrupo}
                disabled={loading}
                className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-lg hover:bg-amber-600 disabled:bg-gray-400"
              >
                {loading ? 'Creando...' : 'Crear Grupo 🎉'}
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Éxito */}
        {step === 3 && grupoCreado && (() => {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const grupoUrl = `${origin}/pedidos/grupo/${grupoCreado.id}`;

          const fmtFecha = (s: string) => {
            const [y, m, d] = s.split('-').map(Number);
            return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
          };
          const rangoFechas = `${fmtFecha(fechaInicio)} al ${fmtFecha(fechaFin)}`;

          const mensaje =
            `¡Armé un grupo para pedir comida en Bingen! 🍽️\n\n` +
            `👤 Creado por: ${nombre}\n` +
            `📅 Plan: ${rangoFechas}\n\n` +
            `🔑 Unite con este código: ${grupoCreado.palabra_secreta}\n\n` +
            `🔗 O entrá directo con este enlace:\n${grupoUrl}`;
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

          const copiarMensaje = async () => {
            try {
              await navigator.clipboard.writeText(mensaje);
              setCopiadoMsg(true);
              setTimeout(() => setCopiadoMsg(false), 2000);
            } catch {
              /* noop */
            }
          };

          return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">¡Grupo creado!</h2>

              <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Tu código para invitar es:</p>
                <div className="text-5xl font-bold text-amber-700 tracking-widest">
                  {grupoCreado.palabra_secreta}
                </div>
              </div>

              {/* Datos del grupo */}
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 text-left space-y-1">
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">👤 Creado por:</span> {nombre}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">📅 Fechas del plan:</span> {rangoFechas}
                </p>
              </div>

              {/* Mensaje para copiar y pegar / WhatsApp */}
              <div className="text-left mb-6">
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">📱 Mensaje para compartir:</p>
                <textarea
                  readOnly
                  value={mensaje}
                  onFocus={(e) => e.target.select()}
                  rows={8}
                  className="w-full text-sm px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 resize-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <button
                    onClick={copiarMensaje}
                    className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-lg"
                  >
                    {copiadoMsg ? '✅ Copiado' : '📋 Copiar mensaje'}
                  </button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    <span>💬</span> Enviar por WhatsApp
                  </a>
                </div>
              </div>

              <button
                onClick={() => router.push(`/pedidos/grupo/${grupoCreado.id}`)}
                className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600"
              >
                Ir al grupo →
              </button>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
