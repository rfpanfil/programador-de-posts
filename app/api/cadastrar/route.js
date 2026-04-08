//arquivo: app/api/cadastrar/route.js

import { put } from '@vercel/blob';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Agora verificamos se existe a lista do carrossel OU o arquivo único original
    const arquivosCarrossel = formData.getAll('arquivos_carrossel');
    const arquivoUnico = formData.get('arquivo');

    let urlsGeradas = [];

    // 1. Upload Múltiplo para o Vercel Blob
    if (arquivosCarrossel && arquivosCarrossel.length > 0) {
      // Loop para subir todas as imagens do carrossel
      for (const file of arquivosCarrossel) {
        if (file && file.size > 0) {
          const blob = await put(file.name, file, { access: 'public', addRandomSuffix: true });
          urlsGeradas.push(blob.url);
        }
      }
    } else if (arquivoUnico && arquivoUnico.size > 0) {
      // Caso normal (apenas 1 arquivo)
      const blob = await put(arquivoUnico.name, arquivoUnico, { access: 'public', addRandomSuffix: true });
      urlsGeradas.push(blob.url);
    } else {
      return NextResponse.json({ error: 'Nenhum arquivo válido enviado.' }, { status: 400 });
    }

    // Junta todas as URLs separadas por vírgula (O Make adora esse formato!)
    const urlDaMidiaFinal = urlsGeradas.join(',');

    // 2. Tratamento da Chave Privada
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '');

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // 3. Conversão da Data
    const rawDate = formData.get('dataPostagem');
    let dataFormatada = rawDate;
    if (rawDate && rawDate.includes('-')) {
      const [year, month, day] = rawDate.split('-');
      dataFormatada = `${day}/${month}/${year}`;
    }

    const doc = new GoogleSpreadsheet('1I19QzsvJHBL6WGZDf7JPj1Bv8RUAglMBPXR0rhWmcdY', serviceAccountAuth);
    await doc.loadInfo(); 
    
    const sheet = doc.sheetsByTitle['Lista_de_programacao'];

    // 4. Inserir linha na planilha
    await sheet.addRow({
      'Data_Postagem': dataFormatada,
      'Tipo': formData.get('tipo'),
      'Hora_Postagem': formData.get('horaPostagem'),
      'Texto': formData.get('texto'),
      'URL_Midia': urlDaMidiaFinal, // Salva o link único ou os vários links com vírgula
      'Status': 'Pendente',
      'Recorrente': formData.get('recorrente'),
      'Regra_Recorrencia': formData.get('regraRecorrencia'),
      'Qtd. Recorrencia': formData.get('qtdRecorrencia'),
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}