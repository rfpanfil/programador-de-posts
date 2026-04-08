// arquivo: app/api/editar/route.js

import { put } from '@vercel/blob';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  try {
    const formData = await request.formData();
    const id = formData.get('id'); // ID da linha (rowNumber)

    if (!id) {
      return NextResponse.json({ error: 'ID da postagem não fornecido.' }, { status: 400 });
    }

    let urlDaMidia = formData.get('urlMidiaAntiga'); // Mantém a antiga por padrão
    const arquivosCarrossel = formData.getAll('arquivos_carrossel');
    const arquivoUnico = formData.get('arquivo');

    // 1. Lógica de Mídia: Só sobe pro Blob se houver arquivos NOVOS
    if (arquivosCarrossel && arquivosCarrossel.length > 0) {
      console.log("Subindo novo carrossel para o Blob...");
      let urlsGeradas = [];
      for (const file of arquivosCarrossel) {
        if (file && file.size > 0) {
          const blob = await put(file.name, file, { access: 'public', addRandomSuffix: true });
          urlsGeradas.push(blob.url);
        }
      }
      urlDaMidia = urlsGeradas.join(','); // Sobrescreve com os novos links
    } else if (arquivoUnico && typeof arquivoUnico !== 'string' && arquivoUnico.size > 0) {
      console.log("Subindo nova mídia única para o Blob...");
      const blob = await put(arquivoUnico.name, arquivoUnico, { access: 'public', addRandomSuffix: true });
      urlDaMidia = blob.url;
    }

    // 2. Autenticação GoogleSheets (Tratamento de Chave Privada)
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

    // 3. Encontra a linha exata pelo número (ID)
    const linhaParaEditar = rows.find(row => row.rowNumber === Number(id));

    if (!linhaParaEditar) {
      return NextResponse.json({ error: 'Postagem não encontrada na planilha.' }, { status: 404 });
    }

    // 4. Conversão da Data (De AAAA-MM-DD para DD/MM/AAAA)
    const rawDate = formData.get('dataPostagem');
    let dataFormatada = rawDate;
    if (rawDate && rawDate.includes('-')) {
      const [year, month, day] = rawDate.split('-');
      dataFormatada = `${day}/${month}/${year}`;
    }

    // 5. Atualiza os campos da linha (set)
    linhaParaEditar.set('Data_Postagem', dataFormatada);
    linhaParaEditar.set('Hora_Postagem', formData.get('horaPostagem'));
    linhaParaEditar.set('Tipo', formData.get('tipo'));
    linhaParaEditar.set('Texto', formData.get('texto'));
    linhaParaEditar.set('URL_Midia', urlDaMidia); // URL Nova ou Antiga mantida
    linhaParaEditar.set('Recorrente', formData.get('recorrente'));
    linhaParaEditar.set('Regra_Recorrencia', formData.get('regraRecorrencia'));
    linhaParaEditar.set('Qtd. Recorrencia', formData.get('qtdRecorrencia'));
    
    // Força o status de volta para Pendente caso estivesse como Erro ou Cancelado
    if(linhaParaEditar.get('Status') !== 'Publicado') {
        linhaParaEditar.set('Status', 'Pendente');
    }

    // 6. Salva as alterações na planilha
    await linhaParaEditar.save();
    console.log(`Linha ${id} editada com sucesso.`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro detalhado no servidor (PATCH):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}