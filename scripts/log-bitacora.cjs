#!/usr/bin/env node
// Autogenerado para el hook post-commit (.githooks/post-commit).
// Lee el ultimo commit y reescribe la tabla "Registro (Git)" de
// docs/bitacoras/<persona>.md, con columnas alineadas por ancho.
//
// No editar esa tabla a mano: este script la regenera completa en cada
// commit (recalcula el ancho de columnas segun el contenido actual).
//
// Mapa de identidad: completar aqui si alguien usa un email/nombre de git
// que todavia no aparece abajo. No requiere reinstalar nada, solo editar
// este archivo.
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const AUTO_COMMIT_PREFIX = 'chore(bitacora-auto):';
const SEP = '\x1f';
const START_MARK = '<!-- AUTO-LOG:START -->';
const END_MARK = '<!-- AUTO-LOG:END -->';

const COLS = [
  { header: 'Fecha y hora', max: 16 },
  { header: 'Usuario', max: 14 },
  { header: 'Descripción del cambio', max: 70 },
  { header: 'Archivos modificados', max: 50 },
];

const EMAIL_MAP = {
  'francosalvatierram@gmail.com': { id: 'matias', nombre: 'Matías' },
  '4ngelica021222@gmail.com': { id: 'angelica', nombre: 'Angélica' },
  'cortezcacereslucas@gmail.com': { id: 'lucas', nombre: 'Lucas' },
  'melissaduranperez@gmail.com': { id: 'melissa', nombre: 'Melissa' },
  'federicosepi4@gmail.com': { id: 'carlos', nombre: 'Carlos' }, // cuenta vieja "Derek598"
  'ignaciocarlos08@gmail.com': { id: 'carlos', nombre: 'Carlos' },
  'biansaye@gmail.com': { id: 'bianca', nombre: 'Bianca' },
};

const NAME_FALLBACK = [
  { re: /bianca/i, id: 'bianca', nombre: 'Bianca' },
  { re: /carlos/i, id: 'carlos', nombre: 'Carlos' },
  { re: /lucas/i, id: 'lucas', nombre: 'Lucas' },
  { re: /meliss/i, id: 'melissa', nombre: 'Melissa' },
  { re: /ang[eé]lica/i, id: 'angelica', nombre: 'Angélica' },
  { re: /mat[ií]as/i, id: 'matias', nombre: 'Matías' },
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return `${str.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function pad(str, width) {
  return str + ' '.repeat(Math.max(0, width - str.length));
}

function parseExistingRows(block) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  // lines[0] = header, lines[1] = separator, el resto son filas de datos
  return lines.slice(2).map((line) => {
    const cells = line.split('|').map((c) => c.trim());
    return cells.slice(1, -1);
  });
}

function renderBlock(rows) {
  const widths = COLS.map((col, i) =>
    Math.max(col.header.length, ...rows.map((r) => (r[i] || '').length), 1)
  );
  const headerLine = `| ${COLS.map((c, i) => pad(c.header, widths[i])).join(' | ')} |`;
  const sepLine = `|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`;
  const rowLines = rows.map(
    (r) => `| ${r.map((cell, i) => pad(cell, widths[i])).join(' | ')} |`
  );
  return [headerLine, sepLine, ...rowLines].join('\n');
}

function upsertRow(filePath, newRow) {
  const contenido = fs.readFileSync(filePath, 'utf8');
  const start = contenido.indexOf(START_MARK);
  const end = contenido.indexOf(END_MARK);
  if (start === -1 || end === -1 || end < start) {
    console.warn(`[bitacora-auto] ${filePath} no tiene los marcadores AUTO-LOG, se omite.`);
    return false;
  }
  const block = contenido.slice(start + START_MARK.length, end);
  const rows = parseExistingRows(block);
  rows.push(newRow);
  const nuevoBloque = `\n${renderBlock(rows)}\n`;
  const actualizado =
    contenido.slice(0, start + START_MARK.length) +
    nuevoBloque +
    contenido.slice(end);
  fs.writeFileSync(filePath, actualizado, 'utf8');
  return true;
}

function identificar(authorName, authorEmail) {
  const porEmail = EMAIL_MAP[authorEmail.toLowerCase()];
  if (porEmail) return porEmail;
  const porNombre = NAME_FALLBACK.find((entry) => entry.re.test(authorName));
  if (porNombre) return porNombre;
  console.warn(
    `[bitacora-auto] No reconozco a "${authorName}" <${authorEmail}>. ` +
    `Se registró en docs/bitacoras/_sin-identificar.md. ` +
    `Agrega este email al EMAIL_MAP de scripts/log-bitacora.cjs para que se asigne bien la próxima vez.`
  );
  return { id: '_sin-identificar', nombre: authorName || authorEmail || 'Desconocido' };
}

function main() {
  const root = git(['rev-parse', '--show-toplevel']);
  process.chdir(root);

  // Uso normal (hook): sin argumentos, procesa HEAD y commitea el resultado.
  // Uso manual (backfill/rebuild): `node scripts/log-bitacora.cjs <hash>`
  // con BITACORA_NO_COMMIT=1 para reprocesar un commit puntual sin generar
  // un commit nuevo.
  const target = process.argv[2] || 'HEAD';

  const subject = git(['log', '-1', '--pretty=%s', target]);
  if (subject.startsWith(AUTO_COMMIT_PREFIX)) {
    return; // evita el loop: este commit ya es la propia actualizacion automatica
  }

  const raw = git([
    'log', '-1',
    '--date=format:%Y-%m-%d %H:%M',
    `--pretty=format:%H${SEP}%an${SEP}%ae${SEP}%ad${SEP}%s`,
    target,
  ]);
  const [hash, authorName, authorEmail, date, subjectLine] = raw.split(SEP);
  const shortHash = hash.slice(0, 7);

  let filesRaw = [];
  try {
    filesRaw = git(['show', '--name-only', '--pretty=format:', hash])
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
  } catch (_) {
    filesRaw = [];
  }
  let archivos = filesRaw.join(', ');
  if (filesRaw.length > 6) {
    archivos = `${filesRaw.slice(0, 6).join(', ')}, … (+${filesRaw.length - 6} más)`;
  }
  if (!archivos) archivos = '(sin archivos)';

  const persona = identificar(authorName, authorEmail);
  const filePath = path.join(root, 'docs', 'bitacoras', `${persona.id}.md`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[bitacora-auto] No existe ${filePath}, se omite el registro.`);
    return;
  }

  const row = [
    date,
    persona.nombre,
    truncate(subjectLine.replace(/\|/g, '\\|'), COLS[2].max),
    truncate(archivos.replace(/\|/g, '\\|'), COLS[3].max),
  ];

  if (!upsertRow(filePath, row)) return;

  const relPath = path.relative(root, filePath).replace(/\\/g, '/');

  if (process.env.BITACORA_NO_COMMIT === '1') {
    console.log(`[bitacora-auto] Fila agregada en ${relPath} (sin commit, BITACORA_NO_COMMIT=1).`);
    return;
  }

  git(['add', relPath]);
  const status = git(['status', '--porcelain', '--', relPath]);
  if (!status) return; // nada que commitear

  git(['commit', '-m', `${AUTO_COMMIT_PREFIX} registrar cambio de ${persona.nombre} (${shortHash})`, '--quiet']);
  console.log(`[bitacora-auto] Fila agregada en ${relPath} para ${persona.nombre}.`);
}

try {
  main();
} catch (err) {
  console.warn(`[bitacora-auto] No se pudo actualizar la bitacora: ${err.message}`);
}
