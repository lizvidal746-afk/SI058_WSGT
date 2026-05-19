// tools/generar-plan-excel.js
const ExcelJS = require('exceljs');
const path = require('path');

function caso(id_num, id, modulo, nombre, escenario, comando, datos, esperado, estado = 'PENDIENTE') {
  return { id_num, id, modulo, nombre, escenario, comando, datos, esperado, estado };
}

async function crearPlanPruebas() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Matriz de Casos de Prueba');

  sheet.columns = [
    { header: 'N°', key: 'id_num', width: 6 },
    { header: 'ID CASO', key: 'id', width: 13 },
    { header: 'MÓDULO', key: 'modulo', width: 16 },
    { header: 'NOMBRE DEL CASO DE PRUEBA', key: 'nombre', width: 34 },
    { header: 'ESCENARIO / CARGA', key: 'escenario', width: 24 },
    { header: 'INSTRUCCIÓN / COMANDO', key: 'comando', width: 36 },
    { header: 'CONDICIÓN Y DATOS DE ENTRADA', key: 'datos', width: 48 },
    { header: 'RESULTADO ESPERADO (CAPACIDAD)', key: 'esperado', width: 55 },
    { header: 'ESTADO', key: 'estado', width: 13 },
  ];

  const casos = [
    caso(1, 'CP-CAR-00', 'Carné', 'Smoke Baseline (Single IP)', 'Smoke', 'npm run smoke:carnet',
      '1 IP / 1 VU / 4 iteraciones / CSV Carnet.',
      'Validar conectividad, credenciales, payload y respuesta funcional antes de cualquier carga. p95 < 1.5s, errores < 1%.'),
    caso(2, 'CP-CAR-01', 'Carné', 'Auditoría Forense (Multi-IP)', 'Audit (Multi-IP)', 'npm run perf:carnet:audit',
      '10 IPs (.48-.57) / Usuarios 2-11 / CSV Carnet.',
      'Latencia p95 < 1.5s. Trazabilidad total de las 10 IPs en DB sin pérdida.'),
    caso(3, 'CP-CAR-02', 'Carné', 'Carga Base Orgánica (Multi-IP)', 'Baseline / Load', 'npm run perf:carnet:cp02',
      '11 IPs / 11 VUs / 10 iteraciones por VU.',
      'Línea base estable: p95 < 1.5s, p99 controlado, APDEX >= 0.90, 0 errores 5xx sostenidos.'),
    caso(4, 'CP-CAR-03', 'Carné', 'Escalabilidad Multi-PC', 'Stress (Ramping)', 'npm run perf:carnet:stress',
      '10 IPs / Escalera de carga hasta 50 VUs configurable.',
      'Validar degradación controlada y escalabilidad sin errores 5xx sostenidos.'),
    caso(5, 'CP-CAR-04', 'Carné', 'Límite de Red WAF (Single IP)', 'WAF Limit', 'npm run perf:carnet:cp01',
      '1 IP / Ramping arrival rate configurable (default 5 -> 20 RPS).',
      'Gateway responde con 429 cuando corresponde sin tumbar backend; recuperación normal al bajar carga.'),
    caso(6, 'CP-CAR-05', 'Carné', 'Saturación Backend (Extreme)', 'Breakpoint / Stress Extreme', 'npm run perf:carnet:cp03',
      '500 VUs default / 10 IPs / sin think time / escalado agresivo.',
      'Determinar punto de quiebre real: VUs, RPS, p95, p99, errores, timeouts y recuperación.'),
    caso(7, 'CP-CAR-06', 'Carné', 'Colapso Controlado', 'Collapse / Breakpoint Rápido', 'npm run perf:carnet:collapse',
      'Rampa rápida hasta 800 VUs default / solo endpoint Carné.',
      'Identificar ruptura rápida, primer 5xx/timeout/429 relevante y capacidad de recuperación posterior.'),
    caso(8, 'CP-CAR-07', 'Carné', 'Pico Repentino', 'Spike', 'npm run perf:carnet:spike',
      'Rampa súbita configurable hasta 50 VUs default.',
      'Validar absorción de pico y recuperación sin errores sostenidos.'),
    caso(9, 'CP-CAR-08', 'Carné', 'Resistencia Sostenida', 'Soak / Endurance', 'npm run perf:carnet:soak',
      '10 VUs default durante 30 minutos configurable.',
      'Detectar degradación gradual, fugas, límites por hora o fatiga del backend.'),

    caso(10, 'CP-GRA-00', 'Grados', 'Smoke Baseline (Single IP)', 'Smoke', 'npm run smoke:grados',
      '1 IP / 1 VU / 4 iteraciones / CSV Grados.',
      'Validar conectividad, credenciales, payload y respuesta funcional antes de cualquier carga. p95 < 1.5s, errores < 1%.'),
    caso(11, 'CP-GRA-01', 'Grados', 'Auditoría Forense (Multi-IP)', 'Audit (Multi-IP)', 'npm run perf:grados:audit',
      '10 IPs (.48-.57) / Usuarios 2-11 / CSV Grados.',
      'Latencia p95 < 1.5s. Trazabilidad total de las 10 IPs de auditoría.'),
    caso(12, 'CP-GRA-02', 'Grados', 'Carga Base Orgánica (Multi-IP)', 'Baseline / Load', 'npm run perf:grados:cp02',
      '11 IPs / 11 VUs / 10 iteraciones por VU.',
      'Línea base estable: p95 < 1.5s, p99 controlado, APDEX >= 0.90, 0 errores 5xx sostenidos.'),
    caso(13, 'CP-GRA-03', 'Grados', 'Escalabilidad Multi-PC', 'Stress (Ramping)', 'npm run perf:grados:stress',
      '10 IPs / Escalera de carga hasta 50 VUs configurable.',
      'Validar procesamiento de consultas complejas sin saturación abrupta ni 5xx sostenidos.'),
    caso(14, 'CP-GRA-04', 'Grados', 'Límite de Red WAF (Single IP)', 'WAF Limit', 'npm run perf:grados:cp01',
      '1 IP / Ramping arrival rate configurable (default 5 -> 20 RPS).',
      'Validar bloqueo y ruteo correcto del WAF ante ráfagas; recuperación normal posterior.'),
    caso(15, 'CP-GRA-05', 'Grados', 'Saturación Backend (Extreme)', 'Breakpoint / Stress Extreme', 'npm run perf:grados:cp03',
      '500 VUs default / 10 IPs / agresivo sin delays.',
      'Buscar límite de concurrencia en base de datos/API de Grados y recuperación posterior.'),
    caso(16, 'CP-GRA-06', 'Grados', 'Colapso Controlado', 'Collapse / Breakpoint Rápido', 'npm run perf:grados:collapse',
      'Rampa rápida hasta 800 VUs default / solo endpoint Grados.',
      'Identificar ruptura rápida, primer 5xx/timeout/429 relevante y capacidad de recuperación posterior.'),
    caso(17, 'CP-GRA-07', 'Grados', 'Pico Repentino', 'Spike', 'npm run perf:grados:spike',
      'Rampa súbita configurable hasta 50 VUs default.',
      'Validar absorción de pico y recuperación sin errores sostenidos.'),
    caso(18, 'CP-GRA-08', 'Grados', 'Resistencia Sostenida', 'Soak / Endurance', 'npm run perf:grados:soak',
      '10 VUs default durante 30 minutos configurable.',
      'Detectar degradación gradual, fugas, límites por hora o fatiga del backend.'),

  ];

  sheet.addRows(casos);

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1A237E' } };
    cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 11, name: 'Segoe UI' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF1A237E' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
  });
  headerRow.height = 35;

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.font = { size: 10, name: 'Segoe UI' };

      if (cell.value === 'PENDIENTE') {
        cell.font = { color: { argb: 'E65100' }, bold: true, name: 'Segoe UI' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E5F5' } };
      }
    });
    row.height = 60;
  });

  sheet.getColumn('id_num').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getColumn('id').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getColumn('modulo').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sheet.getColumn('estado').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:I1';

  const fileName = 'PLAN_DE_PRUEBAS_RENDIMIENTO_SI058_2026-05.xlsx';
  const frameworkPath = path.join(__dirname, '..', fileName);
  const workspacePath = path.join(__dirname, '..', '..', fileName);
  await workbook.xlsx.writeFile(frameworkPath);
  let backupStatus = 'OK';
  try {
    await workbook.xlsx.writeFile(workspacePath);
  } catch (err) {
    backupStatus = `OMITIDO (${err.code || err.message})`;
  }

  console.log(`\n============================================================`);
  console.log(`✅ [EXITO] Plan de Pruebas con ${casos.length} casos generado.`);
  console.log(`Ruta Principal: ${frameworkPath}`);
  console.log(`Ruta Respaldo : ${workspacePath} [${backupStatus}]`);
  console.log(`============================================================\n`);
}

crearPlanPruebas().catch(err => { console.error(err); process.exit(1); });
