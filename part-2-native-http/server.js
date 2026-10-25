const http = require("node:http");

const PORT = 3001;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/hello") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Hello, World!" }));
    return;
  }

  if (req.method === "POST" && req.url === "/users") {
    console.log(`${req.method} ${req.url}`);
    console.log("Content-Type header:", req.headers["content-type"]);

    // The body arrives in pieces ("chunks"), so collect them all before parsing.
    let rawBody = "";

    req.on("data", (chunk) => {
      console.log(`Received chunk of ${chunk.length} bytes`);
      rawBody += chunk;
    });

    req.on("end", () => {
      console.log("Raw body (text):", rawBody);

      let user;
      try {
        user = JSON.parse(rawBody);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid JSON" }));
        return;
      }

      console.log("Parsed body (object):", user);

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "User created" }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not Found" }));
});

server.listen(PORT, () => {
  console.log(`Native HTTP server listening on http://localhost:${PORT}`);
});
