# Troubleshooting mode: "Help me, I'm facing issues"

The learner is stuck. Fix the problem **and** make sure they understand what went wrong, so they can fix it themselves next time. Stay calm and encouraging: errors are normal, and reading them is a core backend skill.

## 1. Gather the facts

If they haven't already said, ask (in one message, not one at a time):

1. **What were you trying to do?** Which part (1–4), and which command or request?
2. **What happened?** Paste the **full** error or output, not a summary.
3. **Where did you run it?** The folder (`pwd`), and whether a server is already running in another terminal.

If they paste something containing an AWS access key or secret, **stop**: tell them to deactivate that key in IAM right away (root `README.md` → "Security rules"), and don't repeat the key back.

## 2. Diagnose with read-only checks first

Reproduce or inspect before changing anything. Useful checks:

```bash
pwd && ls                                   # in the right folder? package.json present?
node -v && npm -v                           # Node 20+ (README recommends 22)
git status && git diff                      # did a file change unexpectedly?
ss -ltnp | grep -E ':300[0-9]'              # what is listening on ports 3000-3009?
ls node_modules >/dev/null && echo "deps installed"
aws configure list                          # Part 4 deploy: credentials set? (never print the secret)
sls --version                               # must be Framework Core 3.x
```

Read the relevant source file and compare it with what the README says it should be. Run the failing command yourself if that's safe, so you see the exact error.

## 3. Explain, then fix

1. **Explain the cause in plain words**, pointing at the line of the error message that gives it away (teach them *how to read* the error), e.g. "`EADDRINUSE` = 'address already in use': another process is already on port 3000."
2. **Propose the fix** and say what it will change. Get the learner's OK before editing files, installing packages, stopping processes or touching AWS.
3. **Prefer letting the learner run the fix** (in their own terminal, or with `! <command>`). If you run it, show the output.
4. **Verify it's fixed** by re-running the original command or request.
5. **Check understanding** with one short question, e.g. "If you see `EADDRINUSE` again, what's the first thing you'd check?"
6. Offer to return to what they were doing before.

When stopping a process, find its PID first (`ss -ltnp` or `ps`), confirm it's the expected `node server.js` (check `/proc/<pid>/cwd`), and stop only that PID. Never use a broad `pkill`.

## 4. Known issues in this repo

### Running the servers (Parts 1–3)

| Symptom | Cause | Fix |
|---|---|---|
| `Error: listen EADDRINUSE: address already in use :::3000` (or 3001/3002) | That server, or another one, is already running | Find it with `ss -ltnp \| grep :3000`, stop it (Ctrl+C in its terminal, or `kill <pid>`), and start again |
| `curl: (7) Failed to connect to localhost port 3001` | The server isn't running, or it's on a different port | Start it with `node server.js` in the right folder; check the port in `server.js` |
| `curl: (1) Received HTTP/0.9 when not allowed` | `curl` was pointed at the Part 1 TCP server, which doesn't speak HTTP | Expected for Part 1: use `nc localhost 3000`. A teaching moment (see Part 1 README) |
| `nc` prints nothing / hangs | The server isn't running, or the wrong port | Start Part 1; use port 3000 |
| `Error: Cannot find module 'express'` | Dependencies weren't installed in Part 3 | `cd part-3-express-server && npm install` |
| `Cannot find module '.../server.js'` | `node server.js` was run from the wrong folder | `cd` into the part's folder first |
| `{"message":"Not Found"}` for a route that should exist | Wrong method or path, or a query string in Part 2 (`req.url` is compared exactly) | Check `-X POST` vs GET, spelling, and the port. In Part 2, `/hello?x=1` ≠ `/hello` |
| `POST /users` returns `400 Invalid JSON` | The body isn't valid JSON: shell quoting, or a missing `-H "Content-Type: application/json"` (Part 3 only parses JSON when that header is set) | Use single quotes around the body: `-d '{"name":"Ada"}'`, and add the header |
| A code change has no effect | The server is still running the old code | Stop it with Ctrl+C and start it again (Node doesn't reload automatically) |

### Part 4: tooling and local runs

| Symptom | Cause | Fix |
|---|---|---|
| VS Code: `File '.../hello.handler.ts' not found` | VS Code's TypeScript server cached the old file name | Ctrl+Shift+P → **TypeScript: Restart TS Server** (or **Developer: Reload Window**) |
| `error TS18003: No inputs were found in config file` | The `include` in `tsconfig.json` doesn't match any files (paths are relative to the tsconfig's folder) | It should be `"include": ["src/**/*.ts"]` |
| No red squiggles for extra spaces | `tsc` doesn't check formatting; Prettier does, through ESLint | `npm run lint` / `npm run lint:fix`; in VS Code, run **ESLint: Restart ESLint Server** |
| `prettier/prettier` lint errors | Formatting doesn't match Prettier | `npm run lint:fix` |
| `Warning: Invalid configuration encountered at 'provider.runtime'` | Serverless v3's checker predates `nodejs22.x` | A harmless warning locally; see the deploy table if AWS rejects it |
| `Cannot find module 'hello'` in `offline` or on AWS | The handler file name has a dot (`hello.handler.ts`); Lambda splits at the first dot | The file must be `src/handlers/hello.ts`, handler `src/handlers/hello.hello` |
| `npm run offline` fails with `EADDRINUSE :::3000` | Part 1's TCP server is on port 3000 | Stop Part 1, or `npx serverless offline --httpPort 3005` |
| `sls --version` shows 4.x and asks for a login | The global Serverless CLI is v4 | `npm uninstall -g serverless && npm install -g serverless@3` |

### Installing and the environment

| Symptom | Cause | Fix |
|---|---|---|
| `npm error code ETIMEDOUT` / `network` errors | Slow or flaky network | Retry with `npm install --fetch-retries=5 --fetch-timeout=120000` |
| `npm install -g` gives `EACCES` | Not using nvm's Node | `nvm use 22`; never use `sudo` with npm |
| `nvm: command not found` | Shell not reloaded after installing nvm | `source ~/.bashrc` or open a new terminal |
| `node -v` shows v20 but the README wants v22 | nvm default not set | `nvm install 22 && nvm alias default 22` |

### Deploying to AWS

See the **Troubleshooting** table at the end of [deploy-guide.md](deploy-guide.md): credentials, `AccessDenied`, the runtime rejected, stuck stacks, wrong endpoint URL.

## 5. If it's not in the tables

Work it out with them: read the full error from the top (the first line usually names the problem; the stack trace shows *where*), check the file and line it mentions, compare with the README's version, and test one change at a time. Explain each step of your reasoning, so they learn how to debug, not just the fix.
