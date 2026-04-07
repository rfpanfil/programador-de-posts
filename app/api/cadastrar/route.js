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
    const blob = await put(file.name, file, { access: 'public' });
    const urlDaMidia = blob.url;

    // 2. Autenticação no Google Sheets
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // ID da Planilha "Programação Posts"
    const doc = new GoogleSpreadsheet('1I19QzsvJHBL6WGZDf7JPj1Bv8RUAglMBPXR0rhWmcdY', serviceAccountAuth);
    await doc.loadInfo(); 
    
    const sheet = doc.sheetsByTitle['Lista_de_programacao'];

    // 3. Inserir linha na planilha
    await sheet.addRow({
      'Data_Postagem': formData.get('dataPostagem'),
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