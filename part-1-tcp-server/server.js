const net = require("node:net");

const server = net.createServer((socket) => {
  socket.write("Hello!");
  socket.end();
});

server.listen(3000);
