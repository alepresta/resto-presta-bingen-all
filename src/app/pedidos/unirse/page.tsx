'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UnirseGrupoPage() {
  const router = useRouter();
  const [palabraSecreta, setPalabraSecreta] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);

  const handleUnirse = async () => {
    setLoading(true);
    setError('');

    try {
      if (!nombre || !email) {
        throw new Error('Nombre y email son obligatorios');
      }

      if (!palabraSecreta || palabraSecreta.length < 6) {
        throw new Error('Ingresá una palabra secreta válida (mínimo 6 caracteres)');
      }

      // Generar ID de cliente local
      const clienteId = crypto.randomUUID();

      localStorage.setItem(
        'cliente_actual',
        JSON.stringify({ id: clienteId, nombre, email })
      );

      const response = await fetch('/api/grupos/unirse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          palabra_secreta: palabraSecreta.toUpperCase(),
          cliente_id: clienteId,
          nombre,
          email,
        }),
      });

      // 🔧 IMPORTANTE: Verificar si la respuesta es JSON antes de parsearla
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const texto = await response.text();
        console.error('Respuesta no-JSON recibida:', texto);
        throw new Error(
          `El servidor no respondió correctamente (status ${response.status}). Verificá que el endpoint /api/grupos/unirse existe.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al unirse');
      }

      router.push(`/pedidos/grupo/${data.grupo_id}`);
    } catch (err: any) {
      console.error('Error completo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50">
      <header className="bg-gradient-to-r from-green-700 to-emerald-600 text-white py-6">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-bold font-serif">🤝 Unirse a un Grupo</h1>
          <p className="text-green-100 mt-1">Ingresá la palabra secreta</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {step === 1 && (
            <>
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
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Tu nombre"
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
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!nombre || !email) {
                    setError('Nombre y email son obligatorios');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="w-full mt-6 bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600"
              >
                Siguiente →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Palabra secreta</h2>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Ingresá la palabra que te compartieron
                </label>
                <input
                  type="text"
                  value={palabraSecreta}
                  onChange={(e) => setPalabraSecreta(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="w-full px-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-center text-3xl font-bold tracking-widest focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="ABC123"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  La palabra secreta la generó quien creó el grupo
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <strong>❌ Error:</strong> {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-300"
                >
                  ← Atrás
                </button>
                <button
                  onClick={handleUnirse}
                  disabled={loading}
                  className="flex-1 bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                >
                  {loading ? 'Uniéndote...' : 'Unirme 🎉'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Info box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>💡 Tip:</strong> Primero necesitás que alguien cree un grupo en{' '}
            <a href="/pedidos/crear" className="underline font-semibold">
              /pedidos/crear
            </a>{' '}
            y te comparta la palabra secreta.
          </p>
        </div>
      </main>
    </div>
  );
}
