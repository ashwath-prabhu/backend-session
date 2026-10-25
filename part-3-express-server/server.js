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
