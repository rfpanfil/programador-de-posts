//arquivo: app/api/cadastrar/route.js

import { put } from '@vercel/blob';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const file = formData.get('arquivo');
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }
    
    // 1. Upload para o Vercel Blob
    const blob = await put(file.name, file, { access: 'public', addRandomSuffix: true });
    const urlDaMidia = blob.url;

    // 2. Tratamento da Chave Privada (Prevenção de erro DECODER)
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '');

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // 3. Conversão da Data (De AAAA-MM-DD para DD/MM/AAAA)
    const rawDate = formData.get('dataPostagem'); // ex: "2026-05-15"
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
      'URL_Midia': urlDaMidia,
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