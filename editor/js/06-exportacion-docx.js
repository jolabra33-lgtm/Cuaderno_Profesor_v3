/* ============================================================================
   Cuaderno del profesor · Editor de exámenes · exportación a Word (DOCX autónomo)
   editor/js/06-exportacion-docx.js
   ============================================================================ */
'use strict';
/* =====================================================================
   EXPORTACIÓN DOCX AUTÓNOMA + VERSIÓN OFFLINE CON FUENTES EMBEBIDAS
   No depende de bibliotecas externas: DOCX es un paquete OOXML ZIP.
   ===================================================================== */
function xmlEsc(v) {
  return String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
const mmTwips = mm => Math.max(0, Math.round(num(mm, 0) * 1440 / 25.4));
const ptHalf = pt => Math.max(2, Math.round(num(pt, 11) * 2));
function wordFontName(id) {
  if (!id) id = 'times';
  if (String(id).startsWith('custom:')) return String(id).slice(7).replace(/["\\]/g, '') || 'Times New Roman';
  const map = { times: 'Times New Roman', georgia: 'Georgia', cambria: 'Cambria', arial: 'Arial', calibri: 'Calibri', verdana: 'Verdana', trebuchet: 'Trebuchet MS', tahoma: 'Tahoma', courier: 'Courier New', lora: 'Lora', garamond: 'EB Garamond', merriweather: 'Merriweather', baskerville: 'Libre Baskerville', sourceserif: 'Source Serif 4', inter: 'Inter', opensans: 'Open Sans', roboto: 'Roboto', lato: 'Lato', montserrat: 'Montserrat', atkinson: 'Atkinson Hyperlegible', lexend: 'Lexend', courierprime: 'Courier Prime', patrick: 'Patrick Hand' };
  return map[id] || 'Times New Roman';
}
function wordRPr(style = {}, flags = {}) {
  const font = wordFontName(style.font || S.exam.base.font);
  const size = ptHalf(flags.size || style.size || S.exam.base.size);
  const col = flags.color || style.color;
  return '<w:rPr><w:rFonts w:ascii="' + xmlEsc(font) + '" w:hAnsi="' + xmlEsc(font) + '" w:eastAsia="' + xmlEsc(font) + '" w:cs="' + xmlEsc(font) + '"/>' +
    (flags.bold ? '<w:b/><w:bCs/>' : '') + (flags.italic ? '<w:i/><w:iCs/>' : '') + (flags.underline ? '<w:u w:val="single"/>' : '') +
    (flags.sub ? '<w:vertAlign w:val="subscript"/>' : '') + (flags.sup ? '<w:vertAlign w:val="superscript"/>' : '') +
    (col ? '<w:color w:val="' + xmlEsc(String(col).replace('#', '')) + '"/>' : '') + '<w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/></w:rPr>';
}
function wordRun(text, style = {}, flags = {}) {
  const chunks = String(text ?? '').split('\n');
  const rpr = wordRPr(style, flags);
  return chunks.map((x, i) => (i ? '<w:r>' + rpr + '<w:br/></w:r>' : '') + (x !== '' ? '<w:r>' + rpr + '<w:t xml:space="preserve">' + xmlEsc(x) + '</w:t></w:r>' : '')).join('');
}
function richWordRuns(html, style = {}, flags = {}) {
  const root = document.createElement('div');
  root.innerHTML = String(html ?? '');
  const out = [];
  function walk(node, fmt) {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        if (child.nodeValue) out.push(wordRun(child.nodeValue.replace(/\u00a0/g, '\u00a0'), style, fmt));
      } else if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        if (['script', 'style', 'iframe', 'object', 'img'].includes(tag)) continue;
        if (tag === 'br') { out.push('<w:r>' + wordRPr(style, fmt) + '<w:br/></w:r>'); continue; }
        const f = { ...fmt, bold: fmt.bold || ['b', 'strong'].includes(tag), italic: fmt.italic || ['i', 'em'].includes(tag), underline: fmt.underline || tag === 'u', sub: fmt.sub || tag === 'sub', sup: fmt.sup || tag === 'sup' };
        if (child.style) {
          if (child.style.fontWeight === 'bold' || Number(child.style.fontWeight) >= 600) f.bold = true;
          if (child.style.fontStyle === 'italic') f.italic = true;
          if ((child.style.textDecorationLine || child.style.textDecoration || '').includes('underline')) f.underline = true;
        }
        walk(child, f);
      }
    }
  }
  walk(root, flags);
  return out.join('');
}
let DOCX_BUILD_OPTIONS = { preserveBreaks: true, keepRows: true, keepParagraphs: true };
function wordPara(runs, style = {}, opts = {}) {
  const pp = [];
  if (opts.pageBreakBefore) pp.push('<w:pageBreakBefore/>');
  if (opts.keepNext) pp.push('<w:keepNext/>');
  if (opts.keepLines || (opts.keepLines !== false && DOCX_BUILD_OPTIONS.keepParagraphs)) pp.push('<w:keepLines/>');
  const align = ({ left: 'left', center: 'center', right: 'right', justify: 'both' })[opts.align || style.align || S.exam.base.align] || 'left';
  pp.push('<w:jc w:val="' + align + '"/>');
  const before = mmTwips(opts.beforeMm || 0), after = mmTwips(opts.afterMm ?? 1.2);
  const line = Math.max(120, Math.round(240 * num(opts.lineHeight, S.exam.base.lh || 1.4)));
  pp.push('<w:spacing w:before="' + before + '" w:after="' + after + '" w:line="' + line + '" w:lineRule="auto"/>');
  if (opts.leftMm || opts.hangingMm) pp.push('<w:ind' + (opts.leftMm ? ' w:left="' + mmTwips(opts.leftMm) + '"' : '') + (opts.hangingMm ? ' w:hanging="' + mmTwips(opts.hangingMm) + '"' : '') + '/>');
  if (opts.borderBottom || opts.borderLeft) {
    pp.push('<w:pBdr>' + (opts.borderBottom ? '<w:bottom w:val="single" w:sz="4" w:space="1" w:color="' + xmlEsc(String(opts.borderColor || S.exam.accent || '#111111').replace('#', '')) + '"/>' : '') +
      (opts.borderLeft ? '<w:left w:val="single" w:sz="10" w:space="7" w:color="777777"/>' : '') + '</w:pBdr>');
  }
  if (opts.shading) pp.push('<w:shd w:val="clear" w:color="auto" w:fill="' + xmlEsc(opts.shading) + '"/>');
  if (!runs) runs = '<w:r>' + wordRPr(style) + '<w:t xml:space="preserve"> </w:t></w:r>';
  return '<w:p>' + (pp.length ? '<w:pPr>' + pp.join('') + '</w:pPr>' : '') + runs + '</w:p>';
}
function wordRichParagraphs(text, style, opts = {}) {
  return String(text ?? '').split('\n').map((line, i) => wordPara(richWordRuns(line, style), style, { ...opts, beforeMm: i === 0 ? (opts.beforeMm || 0) : 0, afterMm: i === String(text ?? '').split('\n').length - 1 ? (opts.afterMm ?? 1.2) : 0 } )).join('');
}
function wordCell(textOrXml, widthTwips, opts = {}) {
  const tcpr = ['<w:tcW w:w="' + Math.max(1, Math.round(widthTwips)) + '" w:type="dxa"/>',
    '<w:vAlign w:val="top"/>', '<w:tcMar><w:top w:w="' + mmTwips(opts.padMm ?? 1.7) + '" w:type="dxa"/><w:start w:w="' + mmTwips(opts.padXmm ?? 2.2) + '" w:type="dxa"/><w:bottom w:w="' + mmTwips(opts.padMm ?? 1.7) + '" w:type="dxa"/><w:end w:w="' + mmTwips(opts.padXmm ?? 2.2) + '" w:type="dxa"/></w:tcMar>'];
  if (opts.shading) tcpr.push('<w:shd w:val="clear" w:color="auto" w:fill="' + xmlEsc(opts.shading) + '"/>');
  if (opts.bottomBorder || opts.allBorder) tcpr.push('<w:tcBorders>' + (opts.allBorder ? ['top','start','bottom','end'].map(x => '<w:' + x + ' w:val="single" w:sz="5" w:color="555555"/>').join('') : '<w:bottom w:val="single" w:sz="5" w:color="555555"/>') + '</w:tcBorders>');
  return '<w:tc><w:tcPr>' + tcpr.join('') + '</w:tcPr>' + (textOrXml || wordPara('', {}, { afterMm: 0 })) + '</w:tc>';
}
function wordTable(rows, widthsPct, opts = {}) {
  const ncol = Math.max(1, ...rows.map(r => r.length));
  const fullWidthTwips = Math.max(1200, num(opts.contentWidthTwips, 9360));
  let widths = Array.from({ length: ncol }, (_, i) => num(widthsPct?.[i], 100 / ncol));
  const sum = widths.reduce((a, b) => a + Math.max(0, b), 0) || 100;
  widths = widths.map(x => Math.round(5000 * Math.max(0, x) / sum));
  widths[widths.length - 1] += 5000 - widths.reduce((a, b) => a + b, 0);
  const borders = opts.border === 'none' ? ['<w:top w:val="nil"/>','<w:start w:val="nil"/>','<w:bottom w:val="nil"/>','<w:end w:val="nil"/>','<w:insideH w:val="nil"/>','<w:insideV w:val="nil"/>'] : opts.border === 'rows' ? ['<w:top w:val="single" w:sz="4" w:color="888888"/>','<w:start w:val="nil"/>','<w:bottom w:val="single" w:sz="4" w:color="888888"/>','<w:end w:val="nil"/>','<w:insideH w:val="single" w:sz="3" w:color="888888"/>','<w:insideV w:val="nil"/>'] : ['<w:top w:val="single" w:sz="5" w:color="444444"/>','<w:start w:val="single" w:sz="5" w:color="444444"/>','<w:bottom w:val="single" w:sz="5" w:color="444444"/>','<w:end w:val="single" w:sz="5" w:color="444444"/>','<w:insideH w:val="single" w:sz="4" w:color="444444"/>','<w:insideV w:val="single" w:sz="4" w:color="444444"/>'];
  const tblPr = '<w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:start w:w="110" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:end w:w="110" w:type="dxa"/></w:tblCellMar><w:tblBorders>' + borders.join('') + '</w:tblBorders></w:tblPr>';
  const grid = '<w:tblGrid>' + widths.map(w => '<w:gridCol w:w="' + Math.round(fullWidthTwips * w / 5000) + '"/>').join('') + '</w:tblGrid>';
  const trs = rows.map((row, ri) => {
    const isHead = !!opts.header && ri === 0;
    const trpr = '<w:trPr>' + (isHead ? '<w:tblHeader w:val="true"/>' : '') + (opts.keepRows !== false ? '<w:cantSplit/>' : '') + '</w:trPr>';
    const cells = Array.from({ length: ncol }, (_, ci) => {
      const v = row[ci] ?? '';
      const cellXml = opts.cellXml ? opts.cellXml(v, ri, ci, isHead) : wordPara(wordRun(String(v), opts.style || S.exam.base, { bold: isHead }), opts.style || S.exam.base, { align: opts.align || (isHead ? 'left' : undefined), afterMm: 0, lineHeight: 1.2 });
      const shade = isHead && opts.hshade ? 'E9E9E9' : (!isHead && opts.zebra && ((ri - (opts.header ? 1 : 0)) % 2 === 1) ? 'F2F2F2' : '');
      return wordCell(cellXml, fullWidthTwips * widths[ci] / 5000, { padMm: opts.padMm ?? 1.7, padXmm: opts.padXmm ?? 2.2, shading: shade, allBorder: opts.border === 'grid', bottomBorder: opts.border === 'rows' });
    }).join('');
    return '<w:tr>' + trpr + cells + '</w:tr>';
  }).join('');
  return '<w:tbl>' + tblPr + grid + trs + '</w:tbl>';
}
function wordFieldRuns(raw, style) {
  return String(raw ?? '').split(/(\{pagina\}|\{paginas\}|\{fecha\})/gi).map(bit => {
    if (/^\{pagina\}$/i.test(bit)) return '<w:fldSimple w:instr=" PAGE "><w:r>' + wordRPr(style) + '<w:t>1</w:t></w:r></w:fldSimple>';
    if (/^\{paginas\}$/i.test(bit)) return '<w:fldSimple w:instr=" NUMPAGES "><w:r>' + wordRPr(style) + '<w:t>1</w:t></w:r></w:fldSimple>';
    if (/^\{fecha\}$/i.test(bit)) return wordRun(new Date().toLocaleDateString('es-ES'), style);
    return wordRun(bit, style);
  }).join('');
}
function wordHeaderXml(cfg, style, isFooter, fullWidthTwips = 9360, logoRun = '') {
  const sides = [cfg.l || '', cfg.c || '', cfg.r || ''];
  const eachWidth = Math.round(fullWidthTwips / 3);
  const grid = '<w:tblGrid><w:gridCol w:w="' + eachWidth + '"/><w:gridCol w:w="' + eachWidth + '"/><w:gridCol w:w="' + (fullWidthTwips - eachWidth * 2) + '"/></w:tblGrid>';
  const border = cfg.rule ? (isFooter ? '<w:top w:val="single" w:sz="4" w:color="666666"/>' : '<w:bottom w:val="single" w:sz="4" w:color="666666"/>') : (isFooter ? '<w:top w:val="nil"/>' : '<w:bottom w:val="nil"/>');
  const tbl = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="fixed"/><w:tblBorders>' + border + '<w:start w:val="nil"/><w:end w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr>' + grid + '<w:tr>' + sides.map((s, i) => { const side = ['l','c','r'][i]; const logo = !isFooter && cfg.logo && cfg.logoPos === side ? logoRun : ''; return wordCell(wordPara(logo + wordFieldRuns(s, style), style, { align: ['left','center','right'][i], afterMm: 0, lineHeight: 1.1 }), eachWidth, { padMm: 1, padXmm: 0 }); }).join('') + '</w:tr></w:tbl>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:' + (isFooter ? 'ftr' : 'hdr') + ' xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' + tbl + '</w:' + (isFooter ? 'ftr' : 'hdr') + '>';
}
function imageSourceToBytes(dataUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      let blob, mime = '';
      if (/^data:/i.test(dataUrl)) {
        const comma = dataUrl.indexOf(','); const meta = dataUrl.slice(5, comma); mime = (meta.split(';')[0] || 'image/png').toLowerCase();
        const payload = dataUrl.slice(comma + 1);
        if (/;base64/i.test(meta)) { const bin = atob(payload); const b = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) b[i] = bin.charCodeAt(i); blob = new Blob([b], { type: mime }); }
        else blob = new Blob([decodeURIComponent(payload)], { type: mime });
      } else {
        const resp = await fetch(dataUrl); if (!resp.ok) throw new Error('No se pudo obtener una imagen del examen.');
        blob = await resp.blob(); mime = (blob.type || 'image/png').toLowerCase();
      }
      const src = URL.createObjectURL(blob);
      const im = new Image();
      im.onload = async () => {
        try {
          let outBlob = blob, ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('gif') ? 'gif' : mime.includes('bmp') ? 'bmp' : 'png';
          if (mime.includes('svg')) {
            const canvas = document.createElement('canvas'); canvas.width = Math.max(1, im.naturalWidth || 1200); canvas.height = Math.max(1, im.naturalHeight || 800);
            canvas.getContext('2d').drawImage(im, 0, 0, canvas.width, canvas.height);
            outBlob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('No se pudo convertir la imagen SVG')), 'image/png'));
            mime = 'image/png'; ext = 'png';
          }
          const bytes = new Uint8Array(await outBlob.arrayBuffer()); URL.revokeObjectURL(src);
          resolve({ bytes, ext, mime, width: im.naturalWidth || 1000, height: im.naturalHeight || 700 });
        } catch (err) { URL.revokeObjectURL(src); reject(err); }
      };
      im.onerror = () => { URL.revokeObjectURL(src); reject(new Error('Una imagen del examen no se pudo leer.')); };
      im.src = src;
    } catch (err) { reject(err); }
  });
}
function imageDrawingXml(relId, id, cx, cy) {
  return '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="' + id + '" name="Imagen ' + id + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + id + '" name="Imagen ' + id + '"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + relId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
}
function crc32(bytes) {
  if (!crc32.table) { crc32.table = new Uint32Array(256); for (let n=0;n<256;n++) { let c=n; for (let k=0;k<8;k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc32.table[n] = c >>> 0; } }
  let c = 0xFFFFFFFF; for (const b of bytes) c = crc32.table[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(files) {
  const enc = new TextEncoder(), local = [], central = []; let offset = 0;
  const now = new Date(), dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds()/2), dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth()+1) << 5) | now.getDate();
  const u16 = (v, i) => { v.setUint16(i, v.getUint16(i, true), true); };
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = crc32(data), lh = new Uint8Array(30 + name.length), lv = new DataView(lh.buffer);
    lv.setUint32(0,0x04034b50,true); lv.setUint16(4,20,true); lv.setUint16(6,0x0800,true); lv.setUint16(8,0,true); lv.setUint16(10,dosTime,true); lv.setUint16(12,dosDate,true); lv.setUint32(14,crc,true); lv.setUint32(18,data.length,true); lv.setUint32(22,data.length,true); lv.setUint16(26,name.length,true); lv.setUint16(28,0,true); lh.set(name,30);
    local.push(lh,data); const ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true); cv.setUint16(8,0x0800,true); cv.setUint16(10,0,true); cv.setUint16(12,dosTime,true); cv.setUint16(14,dosDate,true); cv.setUint32(16,crc,true); cv.setUint32(20,data.length,true); cv.setUint32(24,data.length,true); cv.setUint16(28,name.length,true); cv.setUint16(30,0,true); cv.setUint16(32,0,true); cv.setUint16(34,0,true); cv.setUint16(36,0,true); cv.setUint32(38,0,true); cv.setUint32(42,offset,true); ch.set(name,46);
    central.push(ch); offset += lh.length + data.length;
  }
  const centralSize = central.reduce((s,x)=>s+x.length,0), centralOffset = offset;
  const eocd = new Uint8Array(22), ev = new DataView(eocd.buffer); ev.setUint32(0,0x06054b50,true); ev.setUint16(4,0,true); ev.setUint16(6,0,true); ev.setUint16(8,files.length,true); ev.setUint16(10,files.length,true); ev.setUint32(12,centralSize,true); ev.setUint32(16,centralOffset,true); ev.setUint16(20,0,true);
  return new Blob([...local, ...central, eocd], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
function xmlRel(id, type, target) { return '<Relationship Id="' + id + '" Type="' + type + '" Target="' + target + '"/>'; }
function relsXml(items) { return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + items.join('') + '</Relationships>'; }
async function buildDocxBlob(exam, options = {}) {
  DOCX_BUILD_OPTIONS = { preserveBreaks: options.preserveBreaks !== false, keepRows: options.keepRows !== false, keepParagraphs: options.keepParagraphs !== false };
  const ext = clone(exam), labels = computeLabels(ext), files = [], rels = [], media = [], overrides = [];
  let ridN = 1, imageN = 0;
  const addRel = (type, target) => { const id = 'rId' + ridN++; rels.push(xmlRel(id, type, target)); return id; };
  const headerRid = ext.header.on ? addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/header', 'header1.xml') : null;
  const headerFirstRid = ext.header.on && !ext.header.first ? addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/header', 'headerFirst.xml') : null;
  const footerRid = ext.footer.on ? addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer', 'footer1.xml') : null;
  const footerFirstRid = ext.footer.on && !ext.footer.first ? addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer', 'footerFirst.xml') : null;
  addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles', 'styles.xml');
  const contentWmm = (PAPERS[ext.page.size] || PAPERS.A4)[ext.page.orient === 'landscape' ? 1 : 0] - num(ext.page.ml,22) - num(ext.page.mr,22);
  const baseFont = { ...ext.base };
  function beforeNode(n) { return n.breakBefore && DOCX_BUILD_OPTIONS.preserveBreaks ? wordPara('', baseFont, { pageBreakBefore: true, afterMm: 0 }) : ''; }
  function spacingPara(mm, style) { return mm > 0 ? wordPara('', style, { beforeMm: 0, afterMm: mm, lineHeight: 1, align: 'left' }) : ''; }
  function fontStyle(n, inh) { return effStyle(n, inh, ext); }
  function pointRun(n) { const p = fmtPoints(ext, n.points); return p ? wordRun(' ' + p, { ...ext.base, size: num(ext.base.size, 11) * .92 }) : ''; }
  async function addImage(src, widthPct, align, style, caption) {
    const img = await imageSourceToBytes(src); imageN++;
    const path = 'word/media/image' + imageN + '.' + img.ext, relId = addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', 'media/image' + imageN + '.' + img.ext);
    media.push({ name: path, data: img.bytes, ext: img.ext, mime: img.mime });
    const wmm = Math.max(10, contentWmm * Math.max(5, Math.min(100, num(widthPct,80))) / 100), cx = Math.round(wmm * 36000 / 25.4), cy = Math.round(cx * img.height / Math.max(1, img.width));
    const drawing = '<w:r>' + wordRPr(style) + imageDrawingXml(relId, imageN, cx, cy) + '</w:r>';
    return wordPara(drawing, style, { align: align || 'center', beforeMm: MT.image, afterMm: 0 }) + (caption ? wordPara(richWordRuns(caption, style), style, { align: 'center', afterMm: 2 }) : '');
  }
  function headingRuns(label, title, pts, style, place) {
    let r = '';
    if (label) r += wordRun(label + ' ', style, { bold: true });
    if (title) r += wordRun(title, style, { bold: true });
    if (pts && place === 'inline') r += wordRun(' ' + pts, style, {});
    if (pts && place === 'right') r += wordRun('\t' + pts, style, {});
    return r;
  }
  async function buildNode(n, inh) {
    const { ex, fin } = fontStyle(n, inh), sty = { font: fin.font, size: fin.size, align: fin.align };
    const mt = String(n.spaceBefore ?? '') !== '' && isFinite(num(n.spaceBefore, NaN)) ? Math.max(0, num(n.spaceBefore)) : (MT[n.type] ?? 0);
    let out = beforeNode(n);
    const children = async () => { let s = ''; for (const kid of (n.children || [])) s += await buildNode(kid, ex); return s; };
    switch (n.type) {
      case 'title': {
        if (n.eyebrow) out += wordPara(wordRun(String(n.eyebrow).toUpperCase(), sty, { bold: true }), sty, { beforeMm: mt, afterMm: 1, keepNext: true });
        out += wordPara(wordRun(n.title || '', sty, { bold: true, size: fin.size * 2 }), sty, { beforeMm: n.eyebrow ? 0 : mt, afterMm: 2, keepNext: !!n.subtitle });
        if (n.subtitle) out += wordPara(richWordRuns(n.subtitle, sty), sty, { afterMm: 2, borderBottom: !!n.rule, keepNext: false });
        else if (n.rule) out += wordPara('', sty, { afterMm: 3, borderBottom: true });
        break;
      }
      case 'datos': {
        out += spacingPara(mt, sty);
        const fields = n.fields || [];
        const contentWidthTwips = mmTwips(contentWmm);
        const w = fields.map(f => Math.max(1, num(f.w, 20))); const total = w.reduce((a,b)=>a+b,0) || 100;
        const tbl = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:start w:val="nil"/><w:bottom w:val="nil"/><w:end w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid>' + w.map(x=>'<w:gridCol w:w="'+Math.round(contentWidthTwips*x/total)+'"/>').join('') + '</w:tblGrid><w:tr>' + fields.map((f,i) => {
          const wid = contentWidthTwips * w[i] / total; const inner = wordPara(wordRun(String(f.label || ''), sty, { bold: true, size: fin.size * .68 }), sty, { afterMm: 1, lineHeight: 1.1 }) + wordPara(wordRun(String(f.pre || ' '), sty), sty, { afterMm: 2, borderBottom: true, lineHeight: 1.1 });
          return wordCell(inner, wid, { padMm: 1, padXmm: 1, bottomBorder: false });
        }).join('') + '</w:tr></w:tbl>';
        out += tbl; break;
      }
      case 'section': {
        const label = labels.get(n.id) || '', title = String(n.title || '').trim(), p = fmtPoints(ext, n.points), has = !!(label || title);
        if (has) out += wordPara(headingRuns(label, title, p, { ...sty, size: fin.size * 1.16 }, ext.num.ptsPlace), { ...sty, size: fin.size * 1.16 }, { beforeMm: mt, afterMm: 1.6, keepNext: true });
        else out += spacingPara(mt, sty);
        if (String(n.text || '').trim()) out += wordRichParagraphs(n.text, sty, { beforeMm: has ? 0 : 1.6, afterMm: 1.2 });
        out += await children(); break;
      }
      case 'question': {
        const label = labels.get(n.id) || '', title = String(n.title || '').trim(), pts = fmtPoints(ext, n.points), place = ext.num.ptsPlace;
        if (title) {
          out += wordPara(headingRuns(label, title, pts, { ...sty, size: fin.size * 1.06 }, place), { ...sty, size: fin.size * 1.06 }, { beforeMm: mt, afterMm: 1.3, keepNext: true });
          if (String(n.text || '').trim()) out += wordRichParagraphs(n.text, sty, { afterMm: 1.2 });
          if (pts && place === 'meta') out += wordPara(wordRun(pts, sty, { italic: true }), sty, { afterMm: 1.2 });
        } else {
          let runs = label ? wordRun(label + ' ', sty, { bold: true }) : '';
          if (String(n.text || '').trim()) runs += richWordRuns(String(n.text).split('\n')[0], sty);
          if (pts && place !== 'meta') runs += wordRun(' ' + pts, sty);
          out += wordPara(runs, sty, { beforeMm: mt, afterMm: 1.2 });
          const rest = String(n.text || '').split('\n').slice(1).join('\n'); if (rest) out += wordRichParagraphs(rest, sty, { afterMm: 1.2 });
          if (pts && place === 'meta') out += wordPara(wordRun(pts, sty, { italic: true }), sty, { afterMm: 1.2 });
        }
        out += await children(); break;
      }
      case 'subquestion': {
        const label = labels.get(n.id) || '', pts = fmtPoints(ext, n.points), lines = String(n.text || '').split('\n');
        let r = label ? wordRun(label + ' ', sty, {}) : '';
        r += richWordRuns(lines[0] || '', sty); if (pts) r += wordRun(' ' + pts, sty);
        out += wordPara(r, sty, { beforeMm: mt, afterMm: 1.1, leftMm: label ? 7 : 0, hangingMm: label ? 6 : 0 });
        if (lines.length > 1) out += wordRichParagraphs(lines.slice(1).join('\n'), sty, { afterMm: 1.1, leftMm: label ? 7 : 0 });
        out += await children(); break;
      }
      case 'text': {
        if (n.variant === 'framed') {
          const rows = [[String(n.text || '').split('\n').map(p => wordPara(richWordRuns(p, sty), sty, { afterMm: 1.2 })).join('')]];
          out += spacingPara(mt, sty) + wordTable(rows, [100], { border: 'grid', padMm: 3, padXmm: 3, contentWidthTwips: mmTwips(contentWmm), cellXml: v => v });
        } else {
          const opts = { beforeMm: mt, afterMm: 1.2, borderLeft: n.variant === 'quote', leftMm: n.variant === 'quote' ? 5 : 0 };
          out += wordRichParagraphs(n.text, sty, opts);
        }
        break;
      }
      case 'table': {
        out += spacingPara(mt, sty);
        const T = n.table || { cells: [] }, cells = T.cells || [];
        if (cells.length) out += wordTable(cells, colWidths(T.widths || cells[0].map(() => '')), { style: sty, border: T.border || 'grid', header: !!T.header, hshade: !!T.hshade, zebra: !!T.zebra, keepRows: DOCX_BUILD_OPTIONS.keepRows, padMm: 1.7, padXmm: 2.2, contentWidthTwips: mmTwips(contentWmm) });
        break;
      }
      case 'image': {
        if (n.src) { out += spacingPara(mt, sty); out += await addImage(n.src, n.widthPct, n.imgAlign, sty, n.caption || ''); }
        break;
      }
      case 'lines': {
        out += spacingPara(mt, sty);
        const count = Math.max(1, Math.min(80, Math.round(num(n.count, 6)))), gap = Math.max(4, num(n.spacing, 8));
        for (let i=0;i<count;i++) out += wordPara('', sty, { afterMm: gap, borderBottom: true, borderColor: '#444444', lineHeight: .75 });
        break;
      }
      case 'box': {
        out += spacingPara(mt, sty);
        const inside = (n.title ? wordPara(wordRun(n.title, sty, { bold: true }), sty, { afterMm: 1.2, keepNext: true }) : '') + (String(n.text || '').trim() ? wordRichParagraphs(n.text, sty, { afterMm: 1.2 }) : '');
        out += wordTable([[inside]], [100], { border: 'grid', padMm: 3, padXmm: 3, contentWidthTwips: mmTwips(contentWmm), cellXml: v => v });
        if (num(n.minH, 0) > 0) out += spacingPara(num(n.minH,0), sty);
        break;
      }
      case 'spacer': out += wordPara('', sty, { beforeMm: 0, afterMm: Math.max(1, num(n.height, 20)), lineHeight: 1, align: 'left' }); break;
      default: if (n.text) out += wordRichParagraphs(n.text, sty, { beforeMm: mt });
    }
    return out;
  }
  let body = '';
  for (const n of ext.body || []) body += await buildNode(n, { font: '', size: '', align: '' });
  let headerLogoRun = '', headerLogoRel = null;
  if (ext.header.on && ext.header.logo) {
    const logo = await imageSourceToBytes(ext.header.logo);
    const logoPath = 'word/media/header-logo.' + logo.ext;
    media.push({ name: logoPath, data: logo.bytes, ext: logo.ext, mime: logo.mime });
    headerLogoRel = relsXml([xmlRel('rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', 'media/header-logo.' + logo.ext)]);
    const hMm = Math.max(4, num(ext.header.logoH, 10));
    const wMm = hMm * (logo.width / Math.max(1, logo.height));
    headerLogoRun = '<w:r>' + wordRPr({ font: ext.header.font || ext.base.font, size: num(ext.header.size, 9) }) + imageDrawingXml('rId1', 999, Math.round(wMm * 36000 / 25.4), Math.round(hMm * 36000 / 25.4)) + '</w:r>';
  }
  const psize = (PAPERS[ext.page.size] || PAPERS.A4).slice(); if (ext.page.orient === 'landscape') psize.reverse();
  const pageWidth = Math.round(psize[0] * 1440 / 25.4), pageHeight = Math.round(psize[1] * 1440 / 25.4);
  const sect = '<w:sectPr>' + (headerRid ? '<w:headerReference w:type="default" r:id="' + headerRid + '"/>' : '') + (headerFirstRid ? '<w:headerReference w:type="first" r:id="' + headerFirstRid + '"/>' : '') + (footerRid ? '<w:footerReference w:type="default" r:id="' + footerRid + '"/>' : '') + (footerFirstRid ? '<w:footerReference w:type="first" r:id="' + footerFirstRid + '"/>' : '') +
    (headerFirstRid || footerFirstRid ? '<w:titlePg/>' : '') + '<w:pgSz w:w="' + pageWidth + '" w:h="' + pageHeight + '" w:orient="' + (ext.page.orient === 'landscape' ? 'landscape' : 'portrait') + '"/><w:pgMar w:top="' + mmTwips(ext.page.mt) + '" w:right="' + mmTwips(ext.page.mr) + '" w:bottom="' + mmTwips(ext.page.mb) + '" w:left="' + mmTwips(ext.page.ml) + '" w:header="' + mmTwips(ext.header.off || 9) + '" w:footer="' + mmTwips(ext.footer.off || 8) + '" w:gutter="0"/><w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr>';
  const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' + body + sect + '</w:body></w:document>';
  const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + xmlEsc(wordFontName(ext.base.font)) + '" w:hAnsi="' + xmlEsc(wordFontName(ext.base.font)) + '"/><w:sz w:val="' + ptHalf(ext.base.size) + '"/><w:szCs w:val="' + ptHalf(ext.base.size) + '"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="' + Math.round(240 * num(ext.base.lh, 1.4)) + '" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>';
  const date = new Date().toISOString();
  files.push({ name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Default Extension="bmp" ContentType="image/bmp"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' + (ext.header.on ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : '') + (headerFirstRid ? '<Override PartName="/word/headerFirst.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : '') + (ext.footer.on ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : '') + (footerFirstRid ? '<Override PartName="/word/footerFirst.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : '') + '</Types>' });
  files.push({ name: '_rels/.rels', data: relsXml([xmlRel('rId1','http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument','word/document.xml'), xmlRel('rId2','http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties','docProps/core.xml'), xmlRel('rId3','http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties','docProps/app.xml')]) });
  files.push({ name: 'word/document.xml', data: documentXml }, { name: 'word/styles.xml', data: stylesXml }, { name: 'word/_rels/document.xml.rels', data: relsXml(rels) });
  if (ext.header.on) files.push({ name: 'word/header1.xml', data: wordHeaderXml(ext.header, { font: ext.header.font || ext.base.font, size: num(ext.header.size,9), color: ext.header.color || '#333333' }, false, mmTwips(contentWmm), headerLogoRun) });
  if (headerLogoRel) files.push({ name: 'word/_rels/header1.xml.rels', data: headerLogoRel });
  if (headerFirstRid) files.push({ name: 'word/headerFirst.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p/></w:hdr>' });
  if (ext.footer.on) files.push({ name: 'word/footer1.xml', data: wordHeaderXml(ext.footer, { font: ext.footer.font || ext.base.font, size: num(ext.footer.size,9), color: ext.footer.color || '#333333' }, true, mmTwips(contentWmm)) });
  if (footerFirstRid) files.push({ name: 'word/footerFirst.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p/></w:ftr>' });
  files.push({ name: 'docProps/core.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + xmlEsc(ext.name || 'Examen') + '</dc:title><dc:creator>Editor de exámenes</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + date + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + date + '</dcterms:modified></cp:coreProperties>' });
  files.push({ name: 'docProps/app.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Editor de exámenes</Application></Properties>' });
  files.push(...media);
  return zipStore(files);
}
function exportDocx() { runQualityGate('Word', openDocxOptions); }
function openDocxOptions() {
  const breaks = h('input', { type: 'checkbox', checked: true });
  const rows = h('input', { type: 'checkbox', checked: true });
  const paragraphs = h('input', { type: 'checkbox', checked: true });
  openDialog('Opciones de exportación a Word', h('div', {},
    h('p', { style: { marginTop: 0 } }, 'El documento será editable. Como Word recompone el texto de forma distinta al navegador, estas opciones priorizan una paginación legible.'),
    h('label', { class: 'chk' }, breaks, 'Respetar los saltos de página definidos en el editor'),
    h('label', { class: 'chk' }, rows, 'Evitar que una fila de tabla se divida entre páginas'),
    h('label', { class: 'chk' }, paragraphs, 'Mantener las líneas de cada párrafo juntas cuando sea posible'),
    h('div', { class: 'note' }, 'Los encabezados de las tablas marcadas como tales se configurarán para repetirse automáticamente en Word.')),
    [{ label: 'Cancelar' }, { label: 'Generar Word', primary: true, fn: () => exportDocxDirect({ preserveBreaks: breaks.checked, keepRows: rows.checked, keepParagraphs: paragraphs.checked }) }]);
}
async function exportDocxDirect(options = {}) {
  if (!S.exam.body.length) return toast('Añade contenido al examen antes de exportar');
  const b = $('#btnDocx'); b.disabled = true; const old = b.textContent; b.textContent = 'Generando…';
  try {
    const blob = await buildDocxBlob(S.exam, options);
    const a = h('a', { href: URL.createObjectURL(blob), download: slug(S.exam.name) + '.docx' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    toast('Word descargado. Texto y tablas editables; encabezados repetibles y opciones de paginación aplicadas.');
  } catch (err) {
    console.error(err); toast('No se pudo generar el Word: ' + (err?.message || 'error inesperado'));
  } finally { b.disabled = false; b.textContent = old; DOCX_BUILD_OPTIONS = { preserveBreaks: true, keepRows: true, keepParagraphs: true }; }
}
function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf); let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  return btoa(out);
}
