// Engine-free code generation for compilation/tests only. No runtime engine is downloaded.
const fs = require('node:fs/promises');
const path = require('node:path');
const { getDMMF, getGenerators } = require('@prisma/internals');
async function main() {
  const original = await fs.readFile('prisma/schema.prisma', 'utf8');
  await getDMMF({ datamodel: original });
  const dir = path.resolve('.tmp/type-generation'); await fs.mkdir(dir, { recursive: true });
  const schemaPath = path.join(dir, 'schema.prisma');
  await fs.writeFile(schemaPath, original.replace('provider = "prisma-client-js"', `provider = "prisma-client-js"\n  output = ${JSON.stringify(path.resolve('node_modules/.prisma/client'))}`));
  const generators = await getGenerators({ schemaPath, registry: { 'prisma-client-js': { type: 'rpc', generatorPath: require.resolve('@prisma/client/generator-build'), isNode: true } }, skipDownload: true, noEngine: true });
  try { for (const generator of generators) await generator.generate(); }
  finally { generators.forEach(generator => generator.stop()); }
  console.log('PASS: schema validation and engine-free types. Run normal prisma generate before any native-runtime deployment.');
}
main().catch(() => { console.error('FAIL: engine-free Prisma type generation'); process.exitCode = 1; });
