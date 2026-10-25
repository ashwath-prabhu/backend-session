# Part 1: A TCP Server

> **Why → What → How → Observe → Compare**

## Why

Every web API you'll build, including the Serverless one in `../part-4-serverless/services/users`, sits on top of a much simpler idea: **two programs sending bytes to each other over a network connection**. Before learning HTTP or Express, it helps to see that idea on its own, with nothing added.

This example sends the word `Hello!` to anyone who connects. There are no URLs, no JSON and no status codes, just a connection and some bytes.

## What

### The code

```javascript
const net = require("node:net");

const server = net.createServer((socket) => {
  socket.write("Hello!");
  socket.end();
});

server.listen(3000);
```

### Key ideas

| Term | Plain-English meaning |
|---|---|
| **Process** | A running program. `node server.js` starts one Node.js process. It keeps running for as long as it has something to wait for, like a listening server. |
| **Port** | A number (0–65535) that identifies one program on a machine. The machine's address gets data to the right computer; the port gets it to the right program. Here, port `3000`. |
| **TCP** | *Transmission Control Protocol.* A set of rules for a reliable, ordered, two-way stream of bytes between two programs. If bytes get lost, TCP resends them; they always arrive in order. |
| **TCP connection** | One conversation between a client and a server. It starts with a "handshake" (SYN, SYN-ACK, ACK) and stays open until one side closes it. |
| **Socket** | Your program's handle to one TCP connection. You `write()` bytes into it and read bytes out of it. Each connected client gets its own socket. |

## How: line by line

```javascript
const net = require("node:net");
```
Loads Node.js's built-in `net` module, which works with raw TCP. The `node:` prefix makes it clear this is a built-in module, not something from npm, so there's nothing to install.

```javascript
const server = net.createServer((socket) => {
```
Creates a TCP server object. It isn't listening yet. The arrow function is the **connection callback**: Node.js calls it **once for every new client that connects**, and passes in that client's `socket`.

```javascript
  socket.write("Hello!");
```
Sends the 6 bytes `H e l l o !` to the client over the connection. It's just bytes; nothing tells the client what they mean.

```javascript
  socket.end();
```
Closes our side of the connection after any pending data has been sent. The client sees the connection close and knows nothing more is coming.

```javascript
});
```
End of the connection callback.

```javascript
server.listen(3000);
```
Tells the operating system: "send any TCP connection that arrives on port 3000 to this process." From now on the process stays alive, waiting for connections, until you stop it with **Ctrl+C**.

### Server lifecycle

```text
 node server.js
       │
       ▼
 createServer(callback)          server object exists, not listening yet
       │
       ▼
 listen(3000)                    OS routes port 3000 to this process
       │
       ▼
 ┌──────────── waiting for connections ◄────────────┐
 │                                                   │
 │  client connects (TCP handshake)                  │
 │        │                                          │
 │        ▼                                          │
 │  callback(socket) runs                            │
 │        │  socket.write("Hello!")  ──► client      │
 │        │  socket.end()            ──► close       │
 │        ▼                                          │
 │  connection closed ───────────────────────────────┘
 │
 └── Ctrl+C ──► process exits, port 3000 is released
```

The server never handles just one client and then stops. It goes back to waiting after every connection.

## Observe

**Terminal 1**: start the server:

```bash
cd part-1-tcp-server
node server.js
```

Nothing is printed. That's expected, because the code doesn't log anything. The terminal just stays busy because the process is waiting for connections.

**Terminal 2**: connect with `nc` (netcat), a tool that opens a plain TCP connection:

```bash
nc localhost 3000
```

Expected output:

```text
Hello!
```

`nc` prints the bytes it received, sees the server close the connection, and exits. Your prompt may appear on the same line as `Hello!`, because the server didn't send a newline. Run `nc` again and you get `Hello!` again: each connection runs the callback once more.

Stop the server with **Ctrl+C** in Terminal 1.

### Try this

**Start the server twice.** Run `node server.js` in two terminals. The second one crashes:

```text
Error: listen EADDRINUSE: address already in use :::3000
```

Only one process can listen on a port at a time. You'll hit this error often in backend work. It usually means an old server is still running somewhere.

**Use an HTTP client on it.** With the server running:

```bash
curl localhost:3000/hello
```

```text
curl: (1) Received HTTP/0.9 when not allowed
```

`curl` sent a proper HTTP request and expected an HTTP response, something like `HTTP/1.1 200 OK` followed by headers. It got back just the bare bytes `Hello!`, which isn't a valid modern HTTP response, so it refused.

## Compare: why this is TCP, not HTTP

TCP only moves bytes. It doesn't say what the bytes mean. **HTTP is a set of rules for what the bytes inside a TCP connection should look like.**

| | This TCP server | An HTTP server |
|---|---|---|
| Reads what the client sends? | No, it ignores it completely | Yes: the method (`GET`), path (`/hello`) and headers |
| Response format | Any bytes: `Hello!` | Status line + headers + body: `HTTP/1.1 200 OK`… |
| Different paths/routes | Impossible, there's no concept of a path | `/hello`, `/users`, … |
| Status codes | None | `200`, `404`, `500`, … |
| Works with browsers and `curl` | No | Yes |

To make this server speak HTTP, you'd have to read the client's bytes, parse the request text yourself, and write back a correctly formatted response. That's a lot of fiddly work, and it's exactly what Node.js's `http` module does for you.

## Next: Part 2

In [Part 2](../part-2-native-http/README.md), you'll use Node's built-in `http` module. It still uses TCP underneath, but it parses each request into a `req` object and helps you build a valid response with `res`, so you can handle a real `GET /hello` route.
