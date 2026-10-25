# Part 3: An Express.js Server

> **Why → What → How → Observe → Compare**

## Why

In Part 2, you did everything by hand:

- **Routing:** `if` checks on `req.method` and `req.url`.
- **Sending JSON:** `writeHead` + `JSON.stringify` + `end` for every response.
- **Reading the body:** collecting `"data"` chunks, waiting for `"end"`, `JSON.parse` inside `try`/`catch`.

That's manageable for two routes, but it gets repetitive and error-prone as an API grows.

**Express** is the most widely used Node.js web framework. It doesn't replace the `http` module; it **runs on top of it** and handles the repetitive parts: matching routes, parsing JSON bodies, sending JSON and replying 404.

This part builds the **exact same API** as Part 2, so you can compare them line by line:

| Request | Response |
|---|---|
| `GET /hello` | `200 {"message":"Hello, World!"}` |
| `POST /users` with valid JSON | `201 {"message":"User created"}` |
| `POST /users` with invalid or missing JSON | `400 {"message":"Invalid JSON"}` |
| Anything else | `404 {"message":"Not Found"}` |

## What

### The code

```javascript
const express = require("express");

const PORT = 3002;

const app = express();

// Reads every JSON request body, parses it, and puts the result on req.body.
app.use(express.json());

app.get("/hello", (req, res) => {
  res.json({ message: "Hello, World!" });
});

app.post("/users", (req, res) => {
  console.log(`${req.method} ${req.url}`);
  console.log("Content-Type header:", req.headers["content-type"]);

  // express.json() skips bodies that aren't sent as JSON, leaving req.body undefined.
  if (req.body === undefined) {
    res.status(400).json({ message: "Invalid JSON" });
    return;
  }

  console.log("Parsed body (object):", req.body);

  res.status(201).json({ message: "User created" });
});

// Runs only when no route above matched the request.
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// Error handler: Express calls this when express.json() can't parse the body.
// It needs all four parameters, even though `next` is only used for other errors.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ message: "Invalid JSON" });
    return;
  }

  next(err);
});

app.listen(PORT, () => {
  console.log(`Express server listening on http://localhost:${PORT}`);
});
```

### `package.json`

Express is not built into Node.js. It's a package from npm, so this folder has its own `package.json` listing it as a dependency:

```json
{
  "name": "part-3-express-server",
  "version": "1.0.0",
  "private": true,
  "description": "Minimal Express server with GET /hello",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^5.3.0"
  }
}
```

- `dependencies`: packages the app needs to run. `npm install` downloads them into `node_modules/`.
- `"^5.3.0"`: any `5.x.x` version from 5.3.0 up. Patch and minor updates are allowed, but not a breaking 6.0.
- `scripts.start`: lets you run the server with `npm start`.
- `package-lock.json`, created by `npm install`, records the *exact* versions installed, so everyone gets the same ones.

### Key Express pieces

| Piece | What it does |
|---|---|
| `express()` | Creates an **app**: an object that holds your routes and settings. |
| `app.use(handler)` | Registers **middleware**: a function that runs for *every* request reaching it, whatever the method or path. |
| `express.json()` | Built-in middleware that reads the request body, runs `JSON.parse` on it, and stores the result on `req.body`. It replaces Part 2's chunk-collecting code. |
| `app.get(path, handler)` | Registers a **route**: "when a `GET` request for this path arrives, call this handler." |
| `app.post(path, handler)` | Same, but for `POST` requests. There are also `app.put`, `app.patch` and `app.delete`. |
| `req.body` | The parsed request body, already a JavaScript object, ready to use. |
| `res.json(data)` | Converts `data` to JSON, sets `Content-Type: application/json`, sends it and ends the response, all in one call. |
| `res.status(code)` | Sets the status code (default `200`). It returns `res`, so you can chain `.json(...)` onto it. |
| Error middleware | `app.use((err, req, res, next) => ...)`, with **four** parameters. Express calls it when something earlier fails, such as `express.json()` meeting broken JSON. |
| `app.listen(port, callback)` | Creates the underlying `http` server and starts listening, just like `server.listen` in Part 2. |

## How: line by line

```javascript
const express = require("express");
```
Loads Express from `node_modules/`. This is why `npm install` must run first. There's no `node:` prefix, because it's a third-party package, not a built-in module.

```javascript
const PORT = 3002;
```
Port 3002, so it can run at the same time as Parts 1 and 2.

```javascript
const app = express();
```
Creates the application. Think of `app` as a **list of rules, checked from top to bottom** for each request. The order you write them in matters.

```javascript
app.use(express.json());
```
Rule 1: for **every** request, run the JSON body parser before anything else. If the request has `Content-Type: application/json`, it collects the chunks, waits for the end of the body and calls `JSON.parse`, exactly what you wrote by hand in Part 2, then puts the result on `req.body`. It must come **before** the routes that read `req.body`.

```javascript
app.get("/hello", (req, res) => {
  res.json({ message: "Hello, World!" });
});
```
Rule 2: a `GET` request for `/hello` runs this handler. `req` and `res` are the same objects as in Part 2, with extra helpers added by Express. `res.json` replaces Part 2's three steps: `writeHead`, `JSON.stringify` and `end`.

```javascript
app.post("/users", (req, res) => {
  console.log(`${req.method} ${req.url}`);
  console.log("Content-Type header:", req.headers["content-type"]);
```
Rule 3: a `POST` request for `/users`. The logs show the same already-parsed method, path and header as Part 2.

```javascript
  // express.json() skips bodies that aren't sent as JSON, leaving req.body undefined.
  if (req.body === undefined) {
    res.status(400).json({ message: "Invalid JSON" });
    return;
  }
```
`express.json()` only parses bodies marked `Content-Type: application/json`. If the client sent no body, or sent it as another type, `req.body` stays `undefined`. Part 2's `JSON.parse` would fail on those too, so we reply the same `400`.

```javascript
  console.log("Parsed body (object):", req.body);

  res.status(201).json({ message: "User created" });
});
```
By the time this handler runs, the body is **already an object**: no `"data"`, no `"end"`, no `JSON.parse`. Then we reply `201 Created`.

Notice there's no callback waiting for the body here. In Part 2, the handler returned *before* the body arrived, and the work happened later in `req.on("end")`. Here, `express.json()` waits for the whole body **before** calling your handler, so your code can read top to bottom.

```javascript
// Runs only when no route above matched the request.
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});
```
Rule 4: a catch-all. It only runs if no route above matched. Express already has a built-in 404, but it replies with an HTML page (`Cannot GET /unknown`). This handler makes the 404 JSON, matching Part 2. If this came before `app.get`, *every* request would get a 404.

```javascript
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ message: "Invalid JSON" });
    return;
  }

  next(err);
});
```
Rule 5: the **error handler**. When `express.json()` meets broken JSON, it doesn't crash and doesn't call your route. It passes an error to the next error handler. Express recognizes an error handler by its **four** parameters, so `next` must stay even though we only use it in one place.

- `err.type === "entity.parse.failed"` is how `express.json()` labels "this wasn't valid JSON". We reply `400`, like Part 2's `catch` block.
- `next(err)` passes any *other* error on to Express's default handler, which replies `500`.

Without this handler, broken JSON would still get a `400`, but with an HTML error page instead of our JSON message.

```javascript
app.listen(PORT, () => {
  console.log(`Express server listening on http://localhost:${PORT}`);
});
```
Starts the server and logs once it's ready. Under the hood, this calls `http.createServer(app).listen(PORT)`, the same thing you did by hand in Part 2.

### Request lifecycle

```text
 curl -X POST localhost:3002/users -H "Content-Type: application/json" -d '{"name":"Ada",...}'
       │
       ▼
 Node.js http module          parses method, path, headers → req, res   (same as Part 2)
       │
       ▼
 Express: check rules top to bottom
       │
       ├─ 1. express.json()      Content-Type is JSON?
       │        │ yes: collect chunks → JSON.parse
       │        │        ├── fails ─────────────────────────────┐
       │        │        └── ok → req.body = { name: 'Ada', … } │
       │        │ no:  leave req.body undefined                 │
       │        ▼                                               │
       ├─ 2. app.get("/hello")   GET /hello?  no                │
       │        ▼                                               │
       ├─ 3. app.post("/users")  POST /users? yes               │
       │        ├── req.body undefined → 400 Invalid JSON       │
       │        └── otherwise          → 201 User created       │
       │                                                        │
       ├─ 4. app.use(404)        only if no route matched       │
       │                                                        │
       └─ 5. error handler   ◄──────────────────────────────────┘
                entity.parse.failed → 400 Invalid JSON
       │
       ▼
 Node.js formats and sends the HTTP response
```

## Observe

**Terminal 1**: install and start:

```bash
cd part-3-express-server
npm install          # only needed once; creates node_modules/
npm start            # or: node server.js
```

```text
Express server listening on http://localhost:3002
```

**Terminal 2**: test it. These are the same requests as Part 2, just on port 3002.

**1. `GET /hello`**

```bash
curl -i http://localhost:3002/hello
```

```text
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 27
ETag: W/"1b-9u68i8s9Wl4qBrhqdi8s7jmwKho"
Date: Sun, 25 Oct 2026 17:47:41 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"message":"Hello, World!"}
```

**2. An unknown route**

```bash
curl -i http://localhost:3002/unknown
```

```text
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 23
...

{"message":"Not Found"}
```

**3. The right path but the wrong method**

```bash
curl -i -X POST http://localhost:3002/hello
```

```text
HTTP/1.1 404 Not Found
...
{"message":"Not Found"}
```

`app.get` only matches `GET`, so `POST` falls through to the catch-all.

**4. Create a user with valid JSON**

```bash
curl -i -X POST http://localhost:3002/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

```text
HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 26
ETag: W/"1a-6HEOOYo/3j1gaZ0QSSux1FITqXI"
Date: Sun, 25 Oct 2026 18:01:19 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"message":"User created"}
```

**Terminal 1** shows:

```text
POST /users
Content-Type header: application/json
Parsed body (object): { name: 'Ada', email: 'ada@example.com' }
```

Compare this with Part 2's log. The `Received chunk of 40 bytes` and `Raw body (text)` lines are gone. The chunk collecting and parsing still happen, but inside `express.json()`, before your handler runs. Your handler only ever sees the finished object.

**5. Send broken JSON**

```bash
curl -i -X POST http://localhost:3002/users \
  -H "Content-Type: application/json" \
  -d '{"name":'
```

```text
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 26
...

{"message":"Invalid JSON"}
```

Nothing is logged in Terminal 1, because the `/users` handler never ran. `express.json()` failed and Express jumped straight to the error handler.

**6. Send no body, or no JSON header**

```bash
curl -i -X POST http://localhost:3002/users                # no body at all
curl -i -X POST http://localhost:3002/users -d '{"name":'  # no Content-Type: application/json
```

Both return `400 {"message":"Invalid JSON"}`, the same as Part 2. `req.body` is `undefined` in both cases.

**7. A query string**

```bash
curl -i "http://localhost:3002/hello?name=Ada"
```

This returns `200` with the greeting. Express matches the *path* and ignores the query string, which Part 2's `req.url === "/hello"` check couldn't do.

Stop the server with **Ctrl+C**.

### Notice the extra headers

Compare the outputs with Part 2's. The bodies are identical, but Express added headers for you:

- `Content-Type: application/json; charset=utf-8`: also states the text encoding.
- `Content-Length`: the exact body size. Part 2 used `Transfer-Encoding: chunked` instead, because it didn't specify the length.
- `ETag`: a fingerprint of the body that lets clients cache responses.
- `X-Powered-By: Express`: says which framework is running. Production apps often turn this off with `app.disable("x-powered-by")` so they don't advertise it.

## Compare: Part 2 vs Part 3, side by side

The `POST /users` route, without the logging:

```javascript
// Part 2: native http
if (req.method === "POST" && req.url === "/users") {
  let rawBody = "";

  req.on("data", (chunk) => {
    rawBody += chunk;
  });

  req.on("end", () => {
    let user;
    try {
      user = JSON.parse(rawBody);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Invalid JSON" }));
      return;
    }

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "User created" }));
  });
  return;
}

// Part 3: Express
app.use(express.json()); // once, for every route

app.post("/users", (req, res) => {
  if (req.body === undefined) {
    res.status(400).json({ message: "Invalid JSON" });
    return;
  }

  res.status(201).json({ message: "User created" });
});
// + one error handler for broken JSON, shared by every route
```

| Job | Part 2: native `http` | Part 3: Express |
|---|---|---|
| Match `POST /users` | `if (req.method === "POST" && req.url === "/users")` | `app.post("/users", ...)` |
| Collect the body | `req.on("data")` + `req.on("end")` | `express.json()` |
| Parse JSON | `JSON.parse(rawBody)` | `express.json()`, result in `req.body` |
| Handle broken JSON | `try`/`catch` **in each route** | One error handler **for all routes** |
| Send JSON | `writeHead(...)` + `end(JSON.stringify(...))` | `res.status(...).json(...)` |
| Code flow | Handler returns first; the reply is sent later in `"end"` | Reads top to bottom |

Same behavior, less plumbing. A second `POST` route in Part 2 would need all that body code again. In Express, it's one more `app.post(...)`, and `req.body` is already parsed.

## Summary: TCP vs native HTTP vs Express

| | Part 1: TCP (`net`) | Part 2: Native HTTP (`http`) | Part 3: Express |
|---|---|---|---|
| **Layer** | Transport: raw bytes | HTTP protocol | Framework on top of `http` |
| **Install needed** | No (built in) | No (built in) | Yes: `npm install express` |
| **Port** | 3000 | 3001 | 3002 |
| **Callback runs** | Once per connection | Once per request | Once per matching route |
| **Callback receives** | `socket` | `req`, `res` | `req`, `res` + Express helpers |
| **Reads method and path** | No | Manually: `req.method`, `req.url` | Automatically: `app.get`, `app.post` |
| **Routing** | Not possible | Hand-written `if` checks | `app.get`, `app.post`, … |
| **Reading a JSON body** | Raw bytes only | `"data"`/`"end"` events + `JSON.parse` | `express.json()` → `req.body` |
| **Invalid JSON** | N/A | `try`/`catch` in each route | One error handler |
| **Sending JSON** | N/A | `writeHead` + `JSON.stringify` + `end` | `res.json(...)` |
| **404 handling** | N/A | Fallback after the `if`s | Catch-all `app.use(...)` |
| **Query strings** | N/A | Break exact `req.url` matching | Handled; matches on path only |
| **Test with** | `nc localhost 3000` | `curl -i localhost:3001/hello` | `curl -i localhost:3002/hello` |
| **Best for** | Learning how networking works; custom protocols | Learning HTTP; very small servers | Real APIs with many routes |

Each layer builds on the one before it: **Express uses `http`, which uses `net`/TCP.** Learning them in this order shows what each one does for you.

## Next

You've followed a request from raw TCP bytes, through HTTP parsing, to a framework. The Serverless project in [`../part-4-serverless/services/users`](../part-4-serverless/services/users) serves the same `GET /hello` with a third approach: there's no server process to start at all. AWS API Gateway receives the HTTP request and runs a Lambda function, and that function does the work your Express route handler does here.
