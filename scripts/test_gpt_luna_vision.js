/* eslint-disable @typescript-eslint/no-require-imports */
/* Compatibility entry point: all tests use the canonical importer. */
console.log("Vision testi Local Upload canonical akışı ile çalışıyor.");
const { main } = require("./run_local_product_import");
main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
