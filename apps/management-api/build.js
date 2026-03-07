require("esbuild")
.build({
  entryPoints: ["dist/apps/management-api/apps/management-api/src/main.js"],
  bundle: true,
  platform: "node",
  outfile: "apps/management-api/build/main.js",
    external: [
    "@nestjs/websockets",
    "@nestjs/websockets/socket-module",
    "@grpc/grpc-js",
    "@grpc/proto-loader",
    "nats",
    "mqtt",
    "ioredis",
    "amqplib",
    "amqp-connection-manager",
    "class-transformer/storage",
    "argon2"
  ],
})
.catch((x) => {
  console.error("ESBUILD ERROR: 'FAILED TO CREATE BUILD FILE'");
  console.error(x);
  process.exit(1);
})
