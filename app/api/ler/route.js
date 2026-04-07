//arquivo: app/api/ler/route.js

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Garante que não use cache antigo

export async function GET() {
  try {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '');

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet('1I19QzsvJHBL6WGZDf7JPj1Bv8RUAglMBPXR0rhWmcdY', serviceAccountAuth);
    await doc.loadInfo(); 
    
    const sheet = doc.sheetsByTitle['Lista_de_programacao'];
    const rows = await sheet.getRows();

    // Transforma as linhas do Excel num formato que o React entende
    const posts = rows.map(row => ({
      id: row.rowNumber,
      data: row.get('Data_Postagem'),
      hora: row.get('Hora_Postagem'),
      tipo: row.get('Tipo'),
      texto: row.get('Texto'),
      urlMidia: row.get('URL_Midia'),
      status: row.get('Status'),
      recorrente: row.get('Recorrente'),
      regra: row.get('Regra_Recorrencia'),
      qtd: row.get('Qtd. Recorrencia'),
    }));

    // Inverte para os mais novos aparecerem primeiro
    return NextResponse.json(posts.reverse());

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}