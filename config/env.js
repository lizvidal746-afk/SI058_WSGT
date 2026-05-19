// ============================================================
// config/env.js
// Centraliza la lectura de variables de entorno con validacion.
// ISO/IEC 25010 - Mantenibilidad (Reusabilidad, Modularidad)
// ============================================================

const BASE_URL = __ENV.BASE_URL || 'https://serviciosgytapiqa.sunedu.gob.pe';

// IPs locales (informativo en JS). k6 solo usa K6_LOCAL_IPS si esta definida en el proceso.
// Por defecto vacio: el SO elige la IP (p. ej. WiFi DHCP .8). El rango 48-57 es opcional (alias + setup-ips.ps1).
const LOCAL_IPS_RAW = (__ENV.K6_LOCAL_IPS || '').trim();

function expandIpRange(raw) {
  // Acepta: "ip1,ip2,..." | "ip1-ip2" | "ip1,ip2-ip3"
  const out = [];
  raw.split(',').map(s => s.trim()).forEach(token => {
    if (token.includes('-')) {
      const [start, end] = token.split('-').map(s => s.trim());
      const startParts = start.split('.').map(Number);
      const endParts = end.split('.').map(Number);
      for (let i = startParts[3]; i <= endParts[3]; i++) {
        out.push(`${startParts[0]}.${startParts[1]}.${startParts[2]}.${i}`);
      }
    } else if (token.length > 0) {
      out.push(token);
    }
  });
  return out;
}

const LOCAL_IPS = expandIpRange(LOCAL_IPS_RAW);

// Los usuarios de prueba se leen de data/testUsers.json via lib/users.js
// (SharedArray para no duplicar memoria entre VUs).

const TAGS = {
  testid: __ENV.TEST_ID || 'local-dev',
  environment: __ENV.ENVIRONMENT || 'qa',
  tester: __ENV.TESTER || 'ingenieria-qa',
};

// Grafana Cloud k6 - vincular runs al proyecto si la env esta definida.
// Doc: https://grafana.com/docs/grafana-cloud/k6/projects-and-users/
const CLOUD_PROJECT_ID = __ENV.K6_CLOUD_PROJECT_ID
  ? parseInt(__ENV.K6_CLOUD_PROJECT_ID, 10)
  : undefined;

export function cloudOptions(testName) {
  if (!CLOUD_PROJECT_ID) return undefined;
  return {
    projectID: CLOUD_PROJECT_ID,
    name: `SUNEDU SI058 - ${testName} - ${TAGS.testid}`,
  };
}

export { BASE_URL, LOCAL_IPS, LOCAL_IPS_RAW, TAGS, CLOUD_PROJECT_ID };
