//arquivo: app/page.js

'use client';
import { useState } from 'react';

export default function PainelPosts() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);

    try {
      const response = await fetch('/api/cadastrar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Postagem agendada com sucesso! O Make fará o resto.');
        e.target.reset(); 
      } else {
        const errorData = await response.json();
        alert('Erro ao agendar: ' + errorData.error);
      }
    } catch (error) {
      alert('Erro de conexão com o servidor.');
    }
    
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Agendamento IEL Cajuru
        </h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Postagem</label>
              <input type="text" name="dataPostagem" required placeholder="01/04/2026" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
              <input type="time" name="horaPostagem" required defaultValue="10:00" className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Postagem</label>
            <select name="tipo" required className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500">
              <option value="imagem">Imagem (Feed)</option>
              <option value="video">Vídeo (Reels)</option>
              <option value="carrossel">Carrossel (Várias Imagens)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legenda (Texto)</label>
            <textarea name="texto" rows="4" required placeholder="Digite a legenda e as hashtags aqui..." className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500"></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anexar Arquivo (Foto/Vídeo)</label>
            <input type="file" name="arquivo" accept="image/*, video/*" required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>

          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 mt-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Recorrente?</label>
              <select name="recorrente" className="w-full border border-gray-300 rounded-md p-2">
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Regra (Ex: Anual)</label>
              <input type="text" name="regraRecorrencia" placeholder="Anual, Semanal..." className="w-full border border-gray-300 rounded-md p-2" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qtd.</label>
              <input type="number" name="qtdRecorrencia" placeholder="1" className="w-full border border-gray-300 rounded-md p-2" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors mt-4 disabled:bg-blue-300">
            {loading ? 'Processando e Agendando...' : 'Agendar Postagem'}
          </button>

        </form>
      </div>
    </main>
  );
}