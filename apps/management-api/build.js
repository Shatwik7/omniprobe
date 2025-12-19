require("esbuild")
.build({
  entryPoints: ["dist/apps/management-api/main.js"],
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
    "amqp-connection-manager"
  ],
})
.then(()=>console.log("BUILD SUCCESS"))
.catch((x) => {
  console.error("ESBUILD ERROR: 'FAILED TO CREATE BUILD FILE'");
  console.error(x);
  process.exit(1);
})
