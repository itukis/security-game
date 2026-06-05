const { runAttack } = require('./runner');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.target || !args.attack) {
    console.error('Usage: node src/index.js --target <url> --attack <name>');
    process.exit(1);
  }

  const result = await runAttack({ attackName: args.attack, baseUrl: args.target });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
