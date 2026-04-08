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

  // Novos estados para Edição
  const [isEditing, setIsEditing] = useState(false); // Diz se o modal aberto é pra criar ou editar
  const [editId, setEditId] = useState(null); // Guarda o ID da linha que estamos editando

  const [previewMode, setPreviewMode] = useState(false);
  const [formState, setFormState] = useState({ texto: '', urlMidiaAntiga: null, previewUrls: [] });
  const [processedFiles, setProcessedFiles] = useState([]); 
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0); 
  const [detailsImageIndex, setDetailsImageIndex] = useState(0); // NOVO: Controla a foto no modal de detalhes

  // Função mágica do Canvas: Redimensiona e adiciona fundo preto (1080x1350)
  const padImageToInstagramPortrait = (file) => {
    return new Promise((resolve) => {
      // Se for vídeo, o navegador não edita, então enviamos o original
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Padrão Instagram Portrait (Vertical) - 4:5
        const TARGET_WIDTH = 1080;
        const TARGET_HEIGHT = 1350; 
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;
        const ctx = canvas.getContext('2d');

        // Pinta o fundo de preto
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

        // Calcula a escala para caber a imagem sem cortar nada
        const scale = Math.min(TARGET_WIDTH / img.width, TARGET_HEIGHT / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;

        // Centraliza a imagem no fundo preto
        const x = (TARGET_WIDTH - drawWidth) / 2;
        const y = (TARGET_HEIGHT - drawHeight) / 2;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        // Converte o Canvas de volta para um arquivo JPEG para envio
        canvas.toBlob((blob) => {
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_instagram.jpg", {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/jpeg', 0.95); // 0.95 garante ótima qualidade
      };
      img.src = URL.createObjectURL(file);
    });
  };

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

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const tipoSelecionado = document.getElementById('input-tipo')?.value || 'imagem';

    if (tipoSelecionado !== 'carrossel' && files.length > 1) {
      alert('Para enviar mais de um arquivo, altere o Tipo para "Carrossel".');
      e.target.value = ''; 
      return;
    }

    if (files.length > 10) {
      alert('Limite excedido! O Instagram aceita no máximo 10 mídias por carrossel.');
      e.target.value = ''; 
      return;
    }

    const temImagem = files.some(f => f.type.startsWith('image/'));
    const temVideo = files.some(f => f.type.startsWith('video/'));
    if (temImagem && temVideo) {
      alert('Por favor, não misture fotos e vídeos no mesmo carrossel para garantir o envio correto.');
      e.target.value = '';
      return;
    }

    const processedArray = [];
    for (let i = 0; i < files.length; i++) {
      const finalFile = await padImageToInstagramPortrait(files[i]);
      processedArray.push(finalFile);
    }

    setProcessedFiles(processedArray);
    
    // GERA LINKS TEMPORÁRIOS DE TODAS AS IMAGENS PARA O CARROSSEL
    const previewUrlsArray = processedArray.map(f => URL.createObjectURL(f));
    setFormState({ ...formState, previewUrls: previewUrlsArray });
    setCurrentPreviewIndex(0); // Volta para a primeira foto
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);

    if (processedFiles.length > 0) {
      formData.delete('arquivo'); 
      processedFiles.forEach((file) => {
        formData.append('arquivos_carrossel', file); 
      });
    }

    try {
      const apiUrl = isEditing ? '/api/editar' : '/api/cadastrar';
      const apiMethod = isEditing ? 'PATCH' : 'POST';

      if (isEditing) {
        formData.append('id', editId); 
        formData.append('urlMidiaAntiga', formState.urlMidiaAntiga); 
      }

      const response = await fetch(apiUrl, { method: apiMethod, body: formData });
      
      if (response.ok) {
        alert(isEditing ? 'Postagem atualizada com sucesso!' : 'Postagem agendada com sucesso!');
        setIsModalOpen(false);
        setFormState({ texto: '', urlMidiaAntiga: null, previewUrls: [] });
        setProcessedFiles([]); // CORRIGIDO PARA PLURAL
        setCurrentPreviewIndex(0);
        setIsEditing(false); 
        fetchPosts(); 
      } else {
        const errorData = await response.json();
        alert('Erro: ' + errorData.error);
      }
    } catch (error) {
      alert('Erro de conexão com o servidor.');
    }
    setLoading(false);
  };

  const handleStartEdit = (post) => {
    setIsEditing(true);
    setEditId(post.id);
    
    const [day, month, year] = post.data.split('/');
    const dateForInput = `${year}-${month}-${day}`;

    // SEPARA AS URLS POR VÍRGULA SE FOR CARROSSEL ANTIGO
    const urlsAntigas = post.urlMidia ? post.urlMidia.split(',') : [];

    setFormState({
      texto: post.texto,
      urlMidiaAntiga: post.urlMidia, 
      previewUrls: urlsAntigas // Manda todas as fotos antigas pro preview
    });
    setProcessedFiles([]); // CORRIGIDO PARA PLURAL
    setCurrentPreviewIndex(0);

    setSelectedPost(null); 
    setIsModalOpen(true); 
    
    setTimeout(() => {
        document.getElementById('input-data').value = dateForInput;
        document.getElementById('input-hora').value = post.hora;
        document.getElementById('input-tipo').value = post.tipo;
        document.getElementById('input-texto').value = post.texto;
        document.getElementById('input-recorrente').value = post.recorrente;
        document.getElementById('input-regra').value = post.regra || '';
        document.getElementById('input-qtd').value = post.qtd || '';
    }, 150);
  };

  // Função que chama a API de exclusão
  const handleExcluir = async (id) => {
    const confirmacao = window.confirm('Tem certeza que deseja CANCELAR esta postagem? O Make não fará a publicação.');
    if (!confirmacao) return;

    try {
      const response = await fetch(`/api/excluir?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        alert('Postagem cancelada com sucesso!');
        setSelectedPost(null); // Fecha o modal
        fetchPosts(); // Atualiza a linha do tempo
      } else {
        alert('Erro ao cancelar a postagem.');
      }
    } catch (error) {
      alert('Erro de conexão ao tentar excluir.');
    }
  };

  // Funções para reordenar as fotos do carrossel antes de salvar
  const moveImageLeft = () => {
    if (currentPreviewIndex === 0) return;
    const newProcessed = [...processedFiles];
    const newUrls = [...formState.previewUrls];

    if (newProcessed.length > 0) {
      [newProcessed[currentPreviewIndex - 1], newProcessed[currentPreviewIndex]] = [newProcessed[currentPreviewIndex], newProcessed[currentPreviewIndex - 1]];
      setProcessedFiles(newProcessed);
    }
    
    [newUrls[currentPreviewIndex - 1], newUrls[currentPreviewIndex]] = [newUrls[currentPreviewIndex], newUrls[currentPreviewIndex - 1]];
    
    // CORREÇÃO: Atualizar também a urlMidiaAntiga para o Backend salvar a nova ordem!
    setFormState({ ...formState, previewUrls: newUrls, urlMidiaAntiga: newUrls.join(',') });
    setCurrentPreviewIndex(currentPreviewIndex - 1);
  };

  const moveImageRight = () => {
    if (currentPreviewIndex === formState.previewUrls.length - 1) return;
    const newProcessed = [...processedFiles];
    const newUrls = [...formState.previewUrls];

    if (newProcessed.length > 0) {
      [newProcessed[currentPreviewIndex + 1], newProcessed[currentPreviewIndex]] = [newProcessed[currentPreviewIndex], newProcessed[currentPreviewIndex + 1]];
      setProcessedFiles(newProcessed);
    }
    
    [newUrls[currentPreviewIndex + 1], newUrls[currentPreviewIndex]] = [newUrls[currentPreviewIndex], newUrls[currentPreviewIndex + 1]];
    
    // CORREÇÃO: Atualizar também a urlMidiaAntiga para o Backend salvar a nova ordem!
    setFormState({ ...formState, previewUrls: newUrls, urlMidiaAntiga: newUrls.join(',') });
    setCurrentPreviewIndex(currentPreviewIndex + 1);
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
              onClick={() => { setSelectedPost(post); setDetailsImageIndex(0); }}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl hover:border-gray-600 transition group cursor-pointer flex flex-col"
            >
              {post.urlMidia && (
                <div className="aspect-square bg-black relative overflow-hidden flex items-center justify-center">
                  {/* Pega apenas a primeira imagem se for carrossel (separado por vírgula) */}
                  <img src={post.urlMidia.includes(',') ? post.urlMidia.split(',')[0] : post.urlMidia} loading="lazy" alt="Mídia" className="object-cover w-full h-full group-hover:scale-105 transition duration-500" />
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
          <div 
            className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 backdrop-blur-md cursor-pointer"
            onClick={() => setSelectedPost(null)}
          >
            <div 
              className="bg-gray-900 w-full max-w-5xl h-[90vh] rounded-2xl border border-gray-700 shadow-2xl flex flex-col md:flex-row overflow-hidden relative cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl z-10 transition">
                &times;
              </button>
              
              <div className="flex-[3] bg-black relative flex items-center justify-center p-4 group">
                {/* Mostra a imagem baseada no index atual */}
                <img src={selectedPost.urlMidia.includes(',') ? selectedPost.urlMidia.split(',')[detailsImageIndex] : selectedPost.urlMidia} alt="Original" className="max-w-full max-h-full object-contain rounded-lg transition-all duration-300" />
                
                {/* SETAS: Só aparecem se for carrossel */}
                {selectedPost.urlMidia.includes(',') && (
                  <>
                    {detailsImageIndex > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); setDetailsImageIndex(prev => prev - 1); }} className="absolute left-4 bg-black/60 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/80 transition z-10 shadow-lg text-3xl font-black pb-1">
                        &#10094;
                      </button>
                    )}
                    {detailsImageIndex < selectedPost.urlMidia.split(',').length - 1 && (
                      <button onClick={(e) => { e.stopPropagation(); setDetailsImageIndex(prev => prev + 1); }} className="absolute right-4 bg-black/60 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/80 transition z-10 shadow-lg text-3xl font-black pb-1">
                        &#10095;
                      </button>
                    )}
                    
                    {/* BOLINHAS INDICADORAS NO MODAL DE DETALHES */}
                    <div className="absolute bottom-6 flex gap-2 z-10">
                      {selectedPost.urlMidia.split(',').map((_, idx) => (
                        <div key={idx} className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === detailsImageIndex ? 'bg-blue-500' : 'bg-white/60'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex-[2] p-8 overflow-y-auto bg-gray-900 border-l border-gray-800 flex flex-col relative z-20">
                <div className="mb-6 pb-6 border-b border-gray-800">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedPost.status === 'Pendente' ? 'bg-blue-600' : 
                      selectedPost.status === 'Cancelado' ? 'bg-red-600' : 'bg-green-600'
                    }`}>
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
                  <div className="bg-purple-900/20 border border-purple-900/50 p-4 rounded-xl mb-6">
                    <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                      <span>🔄</span> Configuração de Recorrência
                    </h4>
                    <p className="text-sm text-gray-300 mb-1"><strong>Regra:</strong> {selectedPost.regra}</p>
                    <p className="text-sm text-gray-300"><strong>Postagens restantes:</strong> {selectedPost.qtd === '999' ? 'Infinito' : selectedPost.qtd}</p>
                  </div>
                )}

                {/* BOTÕES DE AÇÃO (EDITAR E EXCLUIR) */}
                {selectedPost.status === 'Pendente' && (
                  <div className="mt-auto pt-6 border-t border-gray-800 flex gap-4">
                    {/* NOVO BOTÃO EDITAR AQUI */}
                    <button 
                      onClick={() => handleStartEdit(selectedPost)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <span>✏️</span> Editar
                    </button>
                    <button 
                      onClick={() => handleExcluir(selectedPost.id)}
                      className="flex-1 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white border border-red-800 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <span>🗑️</span> Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL GIGANTE DE NOVA POSTAGEM (CRIAR OU EDITAR) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-gray-900 w-full max-w-4xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
              
              <div className="flex-1 p-8 overflow-y-auto border-r border-gray-800 custom-scrollbar relative z-20">
                <div className="flex justify-between items-center mb-6">
                  {/* TÍTULO DINÂMICO */}
                  <h2 className="text-2xl font-bold">{isEditing ? 'Editar Postagem' : 'Criar Postagem'}</h2>
                  <button onClick={() => { setIsModalOpen(false); setIsEditing(false); setFormState({texto:'', urlMidiaAntiga: null, previewUrls: []}); setProcessedFiles([]); setCurrentPreviewIndex(0); }} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Data</label>
                      {/* ADICIONADO ID="INPUT-DATA" */}
                      <input type="date" id="input-data" name="dataPostagem" required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white [color-scheme:dark]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Hora</label>
                      {/* ADICIONADO ID="INPUT-HORA" */}
                      <input type="time" id="input-hora" name="horaPostagem" required defaultValue="10:00" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white [color-scheme:dark]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Tipo</label>
                    {/* ADICIONADO ID="INPUT-TIPO" */}
                    <select id="input-tipo" name="tipo" required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white">
                      <option value="imagem">Imagem (Feed)</option>
                      <option value="video">Vídeo (Reels)</option>
                      <option value="carrossel">Carrossel (Várias Imagens)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Legenda</label>
                    {/* ADICIONADO ID="INPUT-TEXTO" */}
                    <textarea id="input-texto" name="texto" rows="4" required onChange={(e) => setFormState({...formState, texto: e.target.value})} placeholder="Digite a legenda..." className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Mídia {isEditing && '(Opcional se manter a antiga)'} {processedFiles.length > 1 && `(${processedFiles.length} selecionados)`}
                    </label>
                    {/* ADICIONADO "multiple" PARA PERMITIR VÁRIOS ARQUIVOS */}
                    <input type="file" name="arquivo" accept="image/*, video/*" multiple required={!isEditing} onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white hover:file:bg-gray-600" />
                  </div>

                  <div className="p-4 bg-gray-950 rounded-lg border border-gray-800 mt-2">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1">Recorrente?</label>
                        {/* ADICIONADO ID="INPUT-RECORRENTE" */}
                        <select id="input-recorrente" name="recorrente" className="w-full bg-gray-800 rounded p-2 text-sm text-white">
                          <option value="Não">Não</option><option value="Sim">Sim</option>
                        </select>
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-xs text-gray-400 mb-1">Regra</label>
                        {/* ADICIONADO ID="INPUT-REGRA" */}
                        <select id="input-regra" name="regraRecorrencia" className="w-full bg-gray-800 rounded p-2 text-sm text-white">
                          <option value="">Nenhuma</option>
                          <option value="Semanal">Semanal</option><option value="Mensal">Mensal</option><option value="Anual">Anual</option>
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-gray-400 mb-1">Qtd</label>
                        {/* ADICIONADO ID="INPUT-QTD" */}
                        <input type="number" id="input-qtd" name="qtdRecorrencia" placeholder="999" className="w-full bg-gray-800 rounded p-2 text-sm text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-4">
                    {/* BOTÃO VOLTAR/CANCELAR NOVO */}
                    <button 
                      type="button" 
                      onClick={() => { setIsModalOpen(false); setIsEditing(false); setFormState({texto:'', urlMidiaAntiga: null, previewUrls: []}); setProcessedFiles([]); setCurrentPreviewIndex(0); }} 
                      className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white py-3 rounded-lg font-bold transition"
                    >
                      Voltar
                    </button>
                    <button type="button" onClick={() => setPreviewMode(!previewMode)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold md:hidden relative z-30">
                      {previewMode ? 'Ver Formulário' : 'Visualizar Prévia'}
                    </button>
                    <button type="submit" disabled={loading} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold disabled:bg-gray-700 relative z-30">
                      {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Agendar Postagem'}
                    </button>
                  </div>
                </form>
              </div>

              {/* LADO DIREITO: PREVIEW (MOCKUPS CSS) */}
              <div className={`flex-1 bg-gray-950 p-8 flex-col items-center justify-start overflow-y-auto ${previewMode ? 'flex' : 'hidden md:flex'} relative z-10`}>
                <h3 className="text-gray-400 font-bold mb-6 tracking-widest text-sm">PRÉVIA DA POSTAGEM</h3>
                {formState.previewUrls && formState.previewUrls.length > 0 ? (
                  <div className="w-full max-w-[340px] flex flex-col gap-8 pb-8">
                    <div className="bg-white rounded-xl overflow-hidden shadow-2xl text-black">
                      <div className="flex items-center p-3 border-b border-gray-200">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                          <div className="w-full h-full bg-white rounded-full border border-white"></div>
                        </div>
                        <span className="ml-3 font-semibold text-sm">ielcajuru</span>
                      </div>
                      
                      {/* ÁREA DA IMAGEM COM NAVEGAÇÃO DE CARROSSEL */}
                      <div className="w-full bg-black relative flex items-center justify-center max-h-[420px] overflow-hidden group">
                        {/* IMAGEM ATUAL */}
                        <img src={formState.previewUrls[currentPreviewIndex]} className="w-full h-auto max-h-[420px] object-contain transition-all duration-300" alt={`Preview IG ${currentPreviewIndex + 1}`} />
                        
                        {/* SETAS DE NAVEGAÇÃO (MAIORES E MAIS GROSSAS) */}
                        {formState.previewUrls.length > 1 && (
                          <>
                            {currentPreviewIndex > 0 && (
                              <button type="button" onClick={() => setCurrentPreviewIndex(prev => prev - 1)} className="absolute left-2 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/80 transition z-10 shadow-lg text-2xl font-black pb-1">
                                &#10094;
                              </button>
                            )}
                            {currentPreviewIndex < formState.previewUrls.length - 1 && (
                              <button type="button" onClick={() => setCurrentPreviewIndex(prev => prev + 1)} className="absolute right-2 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/80 transition z-10 shadow-lg text-2xl font-black pb-1">
                                &#10095;
                              </button>
                            )}
                            
                            {/* BOLINHAS INDICADORAS */}
                            <div className="absolute bottom-3 flex gap-1 z-10">
                              {formState.previewUrls.map((_, idx) => (
                                <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentPreviewIndex ? 'bg-blue-500' : 'bg-white/60'}`} />
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* CONTROLES PARA ORDENAR AS FOTOS DO CARROSSEL */}
                      {formState.previewUrls.length > 1 && (
                        <div className="bg-gray-100 p-2 flex justify-between items-center text-xs font-bold text-gray-700 border-b border-gray-200">
                          <button type="button" onClick={moveImageLeft} disabled={currentPreviewIndex === 0} className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-200 disabled:opacity-30 transition">
                            ◀ Mover para Esquerda
                          </button>
                          <span>Foto {currentPreviewIndex + 1} de {formState.previewUrls.length}</span>
                          <button type="button" onClick={moveImageRight} disabled={currentPreviewIndex === formState.previewUrls.length - 1} className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-200 disabled:opacity-30 transition">
                            Mover para Direita ▶
                          </button>
                        </div>
                      )}

                      <div className="p-3 max-h-36 overflow-y-auto custom-scrollbar-light">
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