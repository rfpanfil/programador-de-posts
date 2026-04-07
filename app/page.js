//arquivo: app/page.js

'use client';
import { useState, useEffect } from 'react';

export default function PainelPosts() {
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('agendadas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [gridSize, setGridSize] = useState(3);
  const [selectedPost, setSelectedPost] = useState(null);

  const [previewMode, setPreviewMode] = useState(false);
  const [formState, setFormState] = useState({ texto: '', midiaUrl: null });

  const fetchPosts = async () => {
    const res = await fetch('/api/ler');
    if (res.ok) {
      const data = await res.json();
      setPosts(data);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const postagensAgendadas = posts.filter(p => p.status === 'Pendente');
  const postagensFeitas = posts.filter(p => p.status === 'Publicado');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormState({ ...formState, midiaUrl: URL.createObjectURL(file) });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);

    try {
      const response = await fetch('/api/cadastrar', { method: 'POST', body: formData });
      if (response.ok) {
        alert('Postagem agendada com sucesso!');
        setIsModalOpen(false);
        setFormState({ texto: '', midiaUrl: null });
        fetchPosts(); 
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
    <main className="min-h-screen bg-gray-950 text-white p-6 relative">
      <div className="max-w-6xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-800 pb-6 gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight">IEL Cajuru Mídia</h1>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
              <span className="text-sm text-gray-400">Tamanho:</span>
              <input 
                type="range" min="1" max="6" 
                value={gridSize} 
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-24 cursor-pointer accent-blue-600"
              />
            </div>
            
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition">
              + Nova Postagem
            </button>
          </div>
        </div>

        {/* ABAS */}
        <div className="flex gap-4 mb-8">
          <button onClick={() => setActiveTab('agendadas')} className={`px-6 py-2 rounded-full font-semibold transition ${activeTab === 'agendadas' ? 'bg-blue-600' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            Agendadas ({postagensAgendadas.length})
          </button>
          <button onClick={() => setActiveTab('feitas')} className={`px-6 py-2 rounded-full font-semibold transition ${activeTab === 'feitas' ? 'bg-green-600' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            Publicadas ({postagensFeitas.length})
          </button>
        </div>

        {/* FEED DE POSTAGENS */}
        <div 
          className="grid gap-6 transition-all duration-300"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {(activeTab === 'agendadas' ? postagensAgendadas : postagensFeitas).map(post => (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl hover:border-gray-600 transition group cursor-pointer flex flex-col"
            >
              {post.urlMidia && (
                <div className="aspect-square bg-black relative overflow-hidden flex items-center justify-center">
                  <img src={post.urlMidia} loading="lazy" alt="Mídia" className="object-contain w-full h-full group-hover:scale-105 transition duration-500" />
                  <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] sm:text-xs font-bold backdrop-blur-sm z-10">
                    {activeTab === 'agendadas' ? `Agendado: ${post.data} às ${post.hora}` : `Postado: ${post.data} às ${post.hora}`}
                  </div>
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <p className="text-sm text-gray-400 mb-2 line-clamp-2">{post.texto}</p>
                {post.recorrente === 'Sim' && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-800 text-xs">
                    <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded border border-purple-700/50">🔄 {post.regra}</span>
                    <span className="text-gray-500">Restam: {post.qtd === '999' ? 'Infinito' : post.qtd}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DETALHES DA POSTAGEM */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-gray-900 w-full max-w-5xl h-[90vh] rounded-2xl border border-gray-700 shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
              <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl z-10 transition">
                &times;
              </button>
              
              <div className="flex-[3] bg-black flex items-center justify-center p-4">
                <img src={selectedPost.urlMidia} alt="Original" className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
              
              <div className="flex-[2] p-8 overflow-y-auto bg-gray-900 border-l border-gray-800 flex flex-col">
                <div className="mb-6 pb-6 border-b border-gray-800">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedPost.status === 'Pendente' ? 'bg-blue-600' : 'bg-green-600'}`}>
                      {selectedPost.status}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {selectedPost.data} às {selectedPost.hora}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Formato: {selectedPost.tipo}</p>
                </div>
                
                <h3 className="text-white font-bold mb-3">Legenda</h3>
                <p className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed flex-1 mb-6">
                  {selectedPost.texto}
                </p>

                {selectedPost.recorrente === 'Sim' && (
                  <div className="bg-purple-900/20 border border-purple-900/50 p-4 rounded-xl">
                    <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                      <span>🔄</span> Configuração de Recorrência
                    </h4>
                    <p className="text-sm text-gray-300 mb-1"><strong>Regra:</strong> {selectedPost.regra}</p>
                    <p className="text-sm text-gray-300"><strong>Postagens restantes:</strong> {selectedPost.qtd === '999' ? 'Infinito' : selectedPost.qtd}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL GIGANTE DE NOVA POSTAGEM */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-gray-900 w-full max-w-4xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
              
              <div className="flex-1 p-8 overflow-y-auto border-r border-gray-800 custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Criar Postagem</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Data</label>
                      <input type="date" name="dataPostagem" required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white [color-scheme:dark]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Hora</label>
                      <input type="time" name="horaPostagem" required defaultValue="10:00" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white [color-scheme:dark]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Tipo</label>
                    <select name="tipo" required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white">
                      <option value="imagem">Imagem (Feed)</option>
                      <option value="video">Vídeo (Reels)</option>
                      {/* OPÇÃO DE CARROSSEL DE VOLTA AQUI: */}
                      <option value="carrossel">Carrossel (Várias Imagens)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Legenda</label>
                    <textarea name="texto" rows="4" required onChange={(e) => setFormState({...formState, texto: e.target.value})} placeholder="Digite a legenda..." className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Mídia</label>
                    <input type="file" name="arquivo" accept="image/*, video/*" required onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white hover:file:bg-gray-600" />
                  </div>

                  <div className="p-4 bg-gray-950 rounded-lg border border-gray-800 mt-2">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">Recorrente?</label>
                        <select name="recorrente" className="w-full bg-gray-800 rounded p-2 text-sm text-white">
                          <option value="Não">Não</option><option value="Sim">Sim</option>
                        </select>
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-xs text-gray-400 mb-1">Regra</label>
                        <select name="regraRecorrencia" className="w-full bg-gray-800 rounded p-2 text-sm text-white">
                          <option value="">Nenhuma</option>
                          <option value="Semanal">Semanal</option><option value="Mensal">Mensal</option><option value="Anual">Anual</option>
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-gray-400 mb-1">Qtd</label>
                        <input type="number" name="qtdRecorrencia" placeholder="999" className="w-full bg-gray-800 rounded p-2 text-sm text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-4">
                    <button type="button" onClick={() => setPreviewMode(!previewMode)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold md:hidden">
                      {previewMode ? 'Ver Formulário' : 'Visualizar Prévia'}
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold disabled:bg-gray-700">
                      {loading ? 'Agendando...' : 'Agendar Postagem'}
                    </button>
                  </div>
                </form>
              </div>

              {/* LADO DIREITO: PREVIEW (MOCKUPS CSS) */}
              <div className={`flex-1 bg-gray-950 p-8 flex-col items-center justify-start overflow-y-auto ${previewMode ? 'flex' : 'hidden md:flex'}`}>
                <h3 className="text-gray-400 font-bold mb-6 tracking-widest text-sm">PRÉVIA DA POSTAGEM</h3>
                {formState.midiaUrl ? (
                  <div className="w-full max-w-[340px] flex flex-col gap-8 pb-8">
                    <div className="bg-white rounded-xl overflow-hidden shadow-2xl text-black">
                      <div className="flex items-center p-3 border-b border-gray-200">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                          <div className="w-full h-full bg-white rounded-full border border-white"></div>
                        </div>
                        <span className="ml-3 font-semibold text-sm">ielcajuru</span>
                      </div>
                      
                      {/* IMAGEM SEM CORTES COM FUNDO PRETO */}
                      <div className="w-full bg-black flex items-center justify-center max-h-[420px] overflow-hidden">
                        <img src={formState.midiaUrl} className="w-full h-auto max-h-[420px] object-contain" alt="Preview IG" />
                      </div>

                      {/* LEGENDA COM ROLAGEM E QUEBRA DE PALAVRA */}
                      <div className="p-3 max-h-36 overflow-y-auto">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                          <span className="font-semibold mr-2">ielcajuru</span>
                          {formState.texto}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl p-8 text-center">
                    <span className="text-4xl mb-4">📱</span>
                    <p>Adicione uma imagem e uma legenda para ver a mágica acontecer.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </main>
  );
}