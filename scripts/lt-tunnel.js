const { spawn } = require('child_process');

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      env: env || process.env,
    });
    proc.on('close', (code) => (code === 0 ? resolve(proc) : reject(new Error(`${cmd} exited ${code}`))));
    proc.on('error', reject);
  });
}

async function startTunnel() {
  console.log('Instalando localtunnel...');
  await run('npm', ['install', '--no-save', '--legacy-peer-deps', 'localtunnel']);

  const localtunnel = require('localtunnel');

  console.log('\nAbriendo tunnel en puerto 8081...');
  const tunnel = await localtunnel({ port: 8081 });

  const tunnelUrl = tunnel.url;
  const host = tunnelUrl.replace(/^https?:\/\//, '');

  console.log('\n========================================');
  console.log(`Tunnel activo: ${tunnelUrl}`);
  console.log(`\nEn Expo Go, escribi manualmente:`);
  console.log(`  exp://${host}`);
  console.log('========================================\n');
  console.log('Iniciando Expo...\n');

  const expo = spawn('npx', ['expo', 'start', '--port', '8081'], {
    env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: host },
    stdio: 'inherit',
    shell: true,
  });

  tunnel.on('error', (err) => console.error('Tunnel error:', err.message));
  tunnel.on('close', () => {
    console.log('Tunnel cerrado');
    expo.kill();
    process.exit(0);
  });

  expo.on('close', () => {
    tunnel.close();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    tunnel.close();
    expo.kill();
    process.exit(0);
  });
}

startTunnel().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
