/* eslint-disable @typescript-eslint/no-require-imports */
/* Canonical entry point for the Local Upload pipeline. */
const importer = require("./run_local_gpt_luna_product_import");

if (require.main === module) {
  importer.main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

module.exports = importer;
