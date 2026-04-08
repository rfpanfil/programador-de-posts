// arquivo: app/api/excluir/route.js

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    // Pega o ID da postagem que veio na URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

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

    // Encontra a linha exata pelo número (ID)
    const linhaParaCancelar = rows.find(row => row.rowNumber === Number(id));

    if (linhaParaCancelar) {
      // Muda o status para Cancelado e salva na planilha
      linhaParaCancelar.set('Status', 'Cancelado');
      await linhaParaCancelar.save();
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Postagem não encontrada.' }, { status: 404 });
    }

  } catch (error) {
    console.error('Erro ao excluir:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}