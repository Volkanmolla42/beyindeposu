/* eslint-disable @typescript-eslint/no-require-imports */
const { main } = require("./run_local_product_import");

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
