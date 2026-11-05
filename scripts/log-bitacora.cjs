#!/usr/bin/env node
// Autogenerado para el hook post-commit (.githooks/post-commit).
// Lee el ultimo commit y agrega una fila en docs/bitacoras/<persona>.md,
// dentro de la seccion "## Registro automatico (Git)".
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

const EMAIL_MAP = {
  'francosalvatierram@gmail.com': { id: 'matias', nombre: 'Matías' },
  '4ngelica021222@gmail.com': { id: 'angelica', nombre: 'Angélica' },
  'cortezcacereslucas@gmail.com': { id: 'lucas', nombre: 'Lucas' },
  'melissaduranperez@gmail.com': { id: 'melissa', nombre: 'Melissa' },
  'federicosepi4@gmail.com': { id: 'carlos', nombre: 'Carlos' },
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

function main() {
  const root = git(['rev-parse', '--show-toplevel']);
  process.chdir(root);

  const subject = git(['log', '-1', '--pretty=%s']);
  if (subject.startsWith(AUTO_COMMIT_PREFIX)) {
    return; // evita el loop: este commit ya es la propia actualizacion automatica
  }

  const raw = git([
    'log', '-1',
    '--date=format:%Y-%m-%d %H:%M',
    `--pretty=format:%H${SEP}%an${SEP}%ae${SEP}%ad${SEP}%s`,
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

  let persona = EMAIL_MAP[authorEmail.toLowerCase()];
  if (!persona) {
    persona = NAME_FALLBACK.find((entry) => entry.re.test(authorName));
  }
  if (!persona) {
    persona = { id: '_sin-identificar', nombre: authorName || authorEmail || 'Desconocido' };
    console.warn(
      `[bitacora-auto] No reconozco a "${authorName}" <${authorEmail}>. ` +
      `Se registro en docs/bitacoras/_sin-identificar.md. ` +
      `Agrega este email al EMAIL_MAP de scripts/log-bitacora.cjs para que se asigne bien la proxima vez.`
    );
  }

  const filePath = path.join(root, 'docs', 'bitacoras', `${persona.id}.md`);
  if (!fs.existsSync(filePath)) {
    console.warn(`[bitacora-auto] No existe ${filePath}, se omite el registro.`);
    return;
  }

  const descripcion = subjectLine.replace(/\|/g, '\\|');
  const archivosEscapados = archivos.replace(/\|/g, '\\|');
  const fila = `| ${date} | ${persona.nombre} | ${descripcion} | ${archivosEscapados} |`;

  const contenido = fs.readFileSync(filePath, 'utf8');
  const marcador = '<!-- AUTO-LOG:END -->';
  if (!contenido.includes(marcador)) {
    console.warn(`[bitacora-auto] ${filePath} no tiene el marcador ${marcador}, se omite.`);
    return;
  }
  const actualizado = contenido.replace(marcador, `${fila}\n${marcador}`);
  fs.writeFileSync(filePath, actualizado, 'utf8');

  const relPath = path.relative(root, filePath).replace(/\\/g, '/');
  git(['add', relPath]);

  const status = git(['status', '--porcelain', '--', relPath]);
  if (!status) {
    return; // nada que commitear (fila idéntica a algo ya presente, no debería pasar)
  }

  git(['commit', '-m', `${AUTO_COMMIT_PREFIX} registrar cambio de ${persona.nombre} (${shortHash})`, '--quiet']);
  console.log(`[bitacora-auto] Fila agregada en ${relPath} para ${persona.nombre}.`);
}

try {
  main();
} catch (err) {
  console.warn(`[bitacora-auto] No se pudo actualizar la bitacora: ${err.message}`);
}
