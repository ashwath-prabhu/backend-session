# Part 2: A Native HTTP Server (no Express)

> **Why → What → How → Observe → Compare**

## Why

The TCP server in Part 1 could only send bytes. It couldn't tell which page the client wanted, and clients like `curl` and browsers rejected its reply. Real APIs need structure: *which* resource is being asked for, *what* action to take, and *whether* it worked.

**HTTP** provides that structure. Node.js includes an `http` module that speaks HTTP for you, with no packages to install.

This server has two routes:

- `GET /hello` **sends** data to the client.
- `POST /users` **receives** data from the client. The client sends a new user as JSON, and the server parses it and replies `User created`.

## What

### The code

```javascript
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
```

### What an HTTP request and response look like

HTTP messages are plain text sent over a TCP connection, just like `Hello!` in Part 1, but in an agreed format.

When you run `curl -i http://localhost:3001/hello`, curl sends this **request**:

```text
GET /hello HTTP/1.1          ← request line: METHOD  PATH  VERSION
Host: localhost:3001         ← headers: extra information, one "Name: value" per line
User-Agent: curl/8.5.0
Accept: */*
                             ← blank line = end of headers
```

The server sends back this **response**:

```text
HTTP/1.1 200 OK                    ← status line: VERSION  STATUS-CODE  REASON
Content-Type: application/json     ← headers
Date: Sun, 25 Oct 2026 17:47:41 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked
                                   ← blank line
{"message":"Hello, World!"}        ← body: the actual data
```

### Key ideas

| Term | Meaning | In this example |
|---|---|---|
| **Method** | *What action* the client wants. | `GET /hello` = read something. `POST /users` = create something. Others: `PUT`/`PATCH` (update), `DELETE`. |
| **Path** | *Which resource* the client wants. | `/hello` |
| **Headers** | Extra information about the message, as `Name: value` pairs. | `Content-Type: application/json` tells the client the body is JSON. |
| **Status code** | A 3-digit number saying *how it went*. | `200` OK, `201` Created, `400` Bad Request, `404` Not Found. `2xx` = success, `4xx` = client's mistake, `5xx` = server's mistake. |
| **Body** | The actual content. Responses have one; requests can too, e.g. the user sent with `POST`. | Response: `{"message":"Hello, World!"}`. Request: `{"name":"Ada","email":"ada@example.com"}` |
| **`req`** | The **request** object Node.js builds for you from the incoming text. | `req.method` → `"GET"`, `req.url` → `"/hello"`, `req.headers` → `{ host: "localhost:3001", … }` |
| **`res`** | The **response** object you use to reply. | `res.writeHead(...)` sets the status and headers; `res.end(...)` sends the body and finishes. |

### How Node.js handles the HTTP parsing

You never see the raw request text above. Node.js does this for you:

1. Accepts the TCP connection, just like `net` did in Part 1.
2. Reads the incoming bytes and **parses** them: splits out the method, path, version and headers.
3. Packs the results into a `req` object, creates an empty `res` object, and calls **your** callback with both.
4. When you call `res.writeHead()` and `res.end()`, it **formats** a valid HTTP response (status line, headers, blank line, body) and writes it to the socket.

Note what Node.js does **not** parse for you: the **request body**. Your callback runs as soon as the headers are parsed, possibly before the body has even arrived. Reading the body and turning it into a JavaScript object is your job. The `POST /users` route shows how.

## How: line by line

```javascript
const http = require("node:http");
```
Loads Node's built-in HTTP module. It's built on top of `net` from Part 1.

```javascript
const PORT = 3001;
```
The port number, stored in a named constant so it's easy to find and change. It's `3001` so it doesn't clash with Part 1's `3000`.

```javascript
const server = http.createServer((req, res) => {
```
Creates an HTTP server. The callback is the **request handler**. It runs **once per HTTP request**, not once per connection like in Part 1, because a single connection can carry several requests (`Connection: keep-alive`).

```javascript
  if (req.method === "GET" && req.url === "/hello") {
```
This is **routing**: deciding what to do based on the method and path. Both must match, so `POST /hello` does *not* get the greeting.

```javascript
    res.writeHead(200, { "Content-Type": "application/json" });
```
Sets the status code to `200` and adds a header saying the body is JSON.

```javascript
    res.end(JSON.stringify({ message: "Hello, World!" }));
```
`JSON.stringify` turns the JavaScript object into the text `{"message":"Hello, World!"}`. `res.end` sends it as the body and **finishes the response**. Every request must end with `res.end()`. Without it, the client waits forever.

```javascript
    return;
  }
```
Stops the function here, so the 404 code below doesn't also run. Trying to send a second response to the same request causes an error.

#### `POST /users`: reading and parsing the request body

A `POST` request carries data in its body. Here's the raw request that `curl` sends in the Observe section below:

```text
POST /users HTTP/1.1                     ← request line
Host: localhost:3001                     ← headers
User-Agent: curl/8.5.0
Accept: */*
Content-Type: application/json           ← "the body is JSON"
Content-Length: 40                       ← "the body is 40 bytes long"
                                         ← blank line
{"name":"Ada","email":"ada@example.com"} ← body: just text, not an object yet
```

```javascript
  if (req.method === "POST" && req.url === "/users") {
```
A second route. Same idea as `/hello`: match on both method and path.

```javascript
    console.log(`${req.method} ${req.url}`);
    console.log("Content-Type header:", req.headers["content-type"]);
```
Logs what Node.js has **already parsed** for us: the method, path and headers. Header names in `req.headers` are always lowercase, so it's `content-type`, not `Content-Type`.

```javascript
    let rawBody = "";
```
An empty string to collect the body into.

```javascript
    req.on("data", (chunk) => {
      console.log(`Received chunk of ${chunk.length} bytes`);
      rawBody += chunk;
    });
```
`req` is a **stream**: data that arrives piece by piece over the TCP connection, the same connection as in Part 1. Node.js fires a `"data"` event for each piece (a **chunk**), which arrives as a `Buffer` of raw bytes. `rawBody += chunk` converts the bytes to text and appends them. A small body usually arrives in one chunk. A large one, like a file upload, can arrive in many.

```javascript
    req.on("end", () => {
      console.log("Raw body (text):", rawBody);
```
The `"end"` event fires once **all** of the body has arrived. Only now is it safe to parse. At this point `rawBody` is still just a string, the text `{"name":"Ada",...}`.

```javascript
      let user;
      try {
        user = JSON.parse(rawBody);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid JSON" }));
        return;
      }
```
**Parsing**: `JSON.parse` turns the JSON text into a real JavaScript object. It's the opposite of `JSON.stringify`. If the text isn't valid JSON, including an empty body, `JSON.parse` **throws an error**. Without `try`/`catch`, that error would crash the whole server. Instead we catch it and reply `400 Bad Request`, which means "your request was wrong", not "the server broke".

```javascript
      console.log("Parsed body (object):", user);
```
Now `user` is an object. You could read `user.name` or `user.email` here. Compare this line's log output with the raw-body line above: text in, object out.

```javascript
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "User created" }));
    });
```
Replies `201 Created`, the status code for "a new resource was created", the usual reply to a successful `POST`. This example doesn't actually store the user anywhere; saving it to a database comes in a later session.

```javascript
    return;
  }
```
This `return` runs **immediately**, before the body has even arrived. The `"data"` and `"end"` callbacks run later, when the chunks show up. The `return` just stops the code from falling through to the 404 below. This "register a callback now, it runs later" pattern is how Node.js handles anything that takes time.

#### The fallback

```javascript
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not Found" }));
});
```
Any request that didn't match a route above gets `404 Not Found`.

```javascript
server.listen(PORT, () => {
  console.log(`Native HTTP server listening on http://localhost:${PORT}`);
});
```
Starts listening on port 3001. Unlike Part 1, it passes a callback that runs **once the server is ready**, so you get a message telling you it started.

### Request lifecycle

```text
 curl -i localhost:3001/hello
       │
       │  raw bytes: "GET /hello HTTP/1.1\r\nHost: …\r\n\r\n"
       ▼
 ┌─────────────── Node.js http module ───────────────┐
 │ 1. accept TCP connection                          │
 │ 2. parse bytes → req { method, url, headers }     │
 │ 3. create res                                     │
 └───────────────────────┬───────────────────────────┘
                         ▼
 ┌─────────────── your request handler ──────────────┐
 │ GET and /hello?                                   │
 │   yes → writeHead(200) → end('{"message":…}')     │
 │   no  → writeHead(404) → end('{"message":         │
 │                              "Not Found"}')       │
 └───────────────────────┬───────────────────────────┘
                         ▼
 Node.js formats "HTTP/1.1 200 OK\r\nContent-Type: …\r\n\r\n{…}"
                         │
                         ▼
                curl prints the response
```

### `POST /users` lifecycle: body parsing

```text
 curl -X POST localhost:3001/users -d '{"name":"Ada",...}'
       │
       ▼
 Node.js parses method, path, headers → calls your handler
       │
       ▼
 handler: POST and /users? yes
       │  register req.on("data") and req.on("end"), then return
       │
       │   ... body bytes arrive over TCP ...
       ▼
 "data" event(s)        rawBody += chunk     (repeats per chunk)
       │
       ▼
 "end" event            rawBody = '{"name":"Ada",...}'   ← text
       │
       ▼
 JSON.parse(rawBody)
       ├── throws ──► 400 {"message":"Invalid JSON"}
       │
       └── ok ──────► user = { name: 'Ada', ... }        ← object
                          │
                          ▼
                      201 {"message":"User created"}
```

## Observe

**Terminal 1**: start the server:

```bash
cd part-2-native-http
node server.js
```

```text
Native HTTP server listening on http://localhost:3001
```

**Terminal 2**: test it. `-i` tells curl to show the status line and headers, not just the body.

**1. The successful route**

```bash
curl -i http://localhost:3001/hello
```

```text
HTTP/1.1 200 OK
Content-Type: application/json
Date: Sun, 25 Oct 2026 17:47:41 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"message":"Hello, World!"}
```

**2. An unknown route**

```bash
curl -i http://localhost:3001/unknown
```

```text
HTTP/1.1 404 Not Found
Content-Type: application/json
Date: Sun, 25 Oct 2026 17:47:41 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"message":"Not Found"}
```

**3. The right path but the wrong method**

```bash
curl -i -X POST http://localhost:3001/hello
```

```text
HTTP/1.1 404 Not Found
...
{"message":"Not Found"}
```

The path matches, but the method doesn't, so the route doesn't match. (A production API would usually reply `405 Method Not Allowed` here, but we keep it simple.)

**4. Create a user with valid JSON**

`-X POST` sets the method, `-H` adds a header, and `-d` sets the request body.

```bash
curl -i -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

```text
HTTP/1.1 201 Created
Content-Type: application/json
Date: Sun, 25 Oct 2026 17:57:40 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"message":"User created"}
```

Now look at **Terminal 1**. The server logged each parsing step:

```text
POST /users
Content-Type header: application/json
Received chunk of 40 bytes
Raw body (text): {"name":"Ada","email":"ada@example.com"}
Parsed body (object): { name: 'Ada', email: 'ada@example.com' }
```

The last two lines show the change: the raw body has double quotes around everything because it's **JSON text**. The parsed body is printed the way Node.js shows a **JavaScript object**.

**5. Send broken JSON**

```bash
curl -i -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"name":'
```

```text
HTTP/1.1 400 Bad Request
Content-Type: application/json
...

{"message":"Invalid JSON"}
```

`JSON.parse` threw an error, `catch` handled it, and the server kept running. An empty body (`curl -X POST http://localhost:3001/users` with no `-d`) gives the same `400`.

Your `Date` header will show the current time. Stop the server with **Ctrl+C**.

> **Note:** `req.url` includes any query string, so `/hello?name=Ada` would *not* match `"/hello"` and would return 404. Handling that means parsing the URL yourself, one more thing Express does for you in Part 3.

## Compare: Part 1 (TCP) vs Part 2 (native HTTP)

| | Part 1: `net` | Part 2: `http` |
|---|---|---|
| Callback runs | Once per **connection** | Once per **request** |
| Callback receives | A raw `socket` | A parsed `req` and a `res` helper |
| Knows the method and path | No | Yes: `req.method`, `req.url` |
| Status codes and headers | No | Yes: `res.writeHead(200, {...})` |
| Works with `curl` and browsers | No | Yes |
| Routing | Not possible | Manual `if` checks |
| Reading the request body | Raw bytes from the socket | Still manual: collect `"data"` chunks, wait for `"end"`, `JSON.parse`, handle errors |

The last two rows are the weak spots. The `if` statements are fine for two routes, but imagine 30, each with different methods, path parameters like `/users/42` and query strings. The `if` chain grows quickly. Every `POST` route would also need the same ~15 lines of chunk collecting and `JSON.parse` error handling, and you'd keep writing the same `writeHead` + `JSON.stringify` + `end` lines.

## Next: Part 3

In [Part 3](../part-3-express-server/README.md), you'll build the same API with **Express**, a small library on top of the `http` module that handles routing and JSON responses so your code only describes *what* each route does. Express can also parse JSON request bodies for you: all the chunk-and-parse code above becomes one line, `app.use(express.json())`.
