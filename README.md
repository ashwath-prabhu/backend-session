# Backend Sessions: Setup Before Day 1

Finish this setup **before the first session**. It takes about 60 to 90 minutes, mostly waiting for downloads.

> This guide is for **Ubuntu or other Debian-based Linux** (Ubuntu 22.04 or 24.04 recommended). All commands are for a bash terminal.

There are two ways to do it:

| Option | How |
|---|---|
| **A. Do it yourself** | Go through Steps 1 to 11 in order. Each step has its commands and a **Verify** command. |
| **B. Let Claude help** | Paste this whole file into Claude (or open it in Claude Code) with the prompt below. Each step also has a small **Ask Claude** prompt if you get stuck on one step. |

> **Step 0 (AWS account) must be done by you, in the browser.** Don't use Claude or the terminal for it. It involves your personal details, payment card, phone verification and MFA. Use Option A or B only after Step 0 is done.

> **Master prompt for Claude:**
> ```
> I'm setting up my Ubuntu Linux machine for a backend workshop. I have already created
> my AWS account and IAM user myself (Step 0), so skip Step 0 and start from Step 1.
> Follow the README below step by step. For each step: check whether the tool is already
> installed (run its Verify command), install it only if it's missing, then run Verify again
> and show me the output. Stop and ask me before anything that needs my password, a browser
> login, or my credit card. Don't skip steps and don't change the order.
> ```

**Do the steps in order.** Later steps depend on earlier ones. For example, the Serverless Framework needs Node.js, and AWS CLI setup needs the AWS account.

---

## Progress checklist

- [ ] 0. AWS account created and secured (yourself, in the browser)
- [ ] 1. Base packages
- [ ] 2. Git
- [ ] 3. VS Code + extensions (including Bruno)
- [ ] 4. Node.js (via nvm) + npm
- [ ] 5. AWS CLI v2, configured with your keys
- [ ] 6. Serverless Framework v3
- [ ] 7. Docker Engine + Docker Compose
- [ ] 8. PostgreSQL (in Docker) + a DB client
- [ ] 9. MongoDB (in Docker) + MongoDB Compass
- [ ] 10. (Optional) Claude Code
- [ ] 11. Final check passes

---

## Step 0: Create and secure your AWS account (do this yourself, in the browser)

> **Do this step yourself in the AWS web console.** Don't use Claude or any terminal commands for it, and never share your root password, card details, MFA codes or access keys with anyone, Claude included.

**Why:** We deploy Lambda, API Gateway, Cognito, S3 to AWS. You need your **own** account.

**You'll need:** an email address you can access, a phone number, and a debit or credit card. AWS may place a small temporary charge to verify the card. Everything we build stays within free-tier or credits if you clean up with `sls remove` afterwards.

### 0.1 Sign up
1. Go to https://aws.amazon.com/ and click **Create an AWS Account**.
2. Enter your email and an account name such as `yourname-backend-training`.
3. Verify your email with the code AWS sends you.
4. Set a strong **root password** and save it in a password manager.
5. Choose **Personal** account type and fill in your contact details.
6. Add your payment card.
7. Verify your phone number by SMS or voice call.
8. Pick the **Basic support (free)** plan. If you're asked to choose an account plan, pick the **Free** plan.
9. Wait for the "account activated" email. It's usually a few minutes, but can take up to 24 hours, which is why you should **do this first**.

### 0.2 Turn on MFA for the root user (required)
1. Sign in as the root user at https://console.aws.amazon.com/.
2. Click your account name (top right) → **Security credentials**.
3. Under **Multi-factor authentication (MFA)**, click **Assign MFA device**.
4. Choose **Authenticator app** and scan the QR code with Google Authenticator, Microsoft Authenticator or Authy.

### 0.3 Set a budget alert (required)
This emails you before you spend money by accident.
1. Console search bar → **Billing and Cost Management** → **Budgets** → **Create budget**.
2. Choose **Use a template** → **Zero spend budget** (or a **Monthly cost budget** of $5).
3. Enter your email and click **Create budget**.

### 0.4 Create an IAM user for daily work
Don't use the root user day to day. Create an admin user for the workshop instead.
1. Console search → **IAM** → **Users** → **Create user**.
2. User name: `workshop-admin`. Tick **Provide user access to the AWS Management Console** and set a password.
3. Permissions: **Attach policies directly** → tick **AdministratorAccess** → **Create user**.
4. Open the new user → **Security credentials** tab → **Create access key**.
5. Use case: **Command Line Interface (CLI)** → tick the confirmation → **Create access key**.
6. **Download the .csv file** or copy both keys now. You can't see the secret key again.
   **Never commit these keys to Git, paste them in chat, or share them.**
7. Note your **Account ID** (12 digits, shown in the top right menu). You'll use it as the sign-in URL for this user: `https://<ACCOUNT_ID>.signin.aws.amazon.com/console`.

### 0.5 Pick your region
We'll use **`ap-south-1` (Mumbai)** unless the instructor says otherwise. Select it in the console's region dropdown (top right).

> **Stuck?** Ask the instructor, or see AWS's guide: https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-creating.html

**Done when:** you can sign in as `workshop-admin` and you have the access key CSV saved somewhere safe.

---

## Step 1: Base packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget unzip ca-certificates build-essential
```

**Verify:** `curl --version && unzip -v | head -1`

---

## Step 2: Git

```bash
sudo apt install -y git
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

**Verify:** `git --version` should print `git version 2.x`.

---

## Step 3: VS Code + extensions

**Install:**
```bash
sudo snap install code --classic
```
(Or download the `.deb` from https://code.visualstudio.com/ and run `sudo apt install ./code_*.deb`.)

**Install these extensions:**
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-azuretools.vscode-docker
code --install-extension redhat.vscode-yaml
code --install-extension 42Crunch.vscode-openapi
code --install-extension amazonwebservices.aws-toolkit-vscode
code --install-extension bruno-api-client.bruno
```

| Extension | Used for |
|---|---|
| ESLint, Prettier | Linting and formatting (ESLint/TS basics) |
| Docker | Dockerfiles, images, compose |
| YAML | `serverless.yml`, `docker-compose.yml` |
| OpenAPI | OpenAPI 3.0 specs |
| AWS Toolkit | Browsing Lambda, CloudWatch logs, S3 |
| Bruno | API client: testing our APIs, sending Cognito tokens in headers, API collections |

**Verify:** `code --version` and `code --list-extensions` (the list should include `bruno-api-client.bruno`).

To check Bruno works: open the Bruno icon in the VS Code sidebar, create a collection, add a `GET https://httpbin.org/get` request and send it. You should get `200 OK`.

---

## Step 4: Node.js (via nvm) + npm

**Why:** All Lambda code, Joi, Knex and the Serverless Framework run on Node.js. We use **Node 22 LTS** to match the Lambda `nodejs22.x` runtime. Use `nvm` so you can switch versions later.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
nvm alias default 22
```

**Verify:**
```bash
node -v    # v22.x.x
npm -v     # 10.x or later
```

> **Ask Claude:** "Install Node.js 22 using nvm on Ubuntu and make it the default. `node -v` shows: <paste>."

---

## Step 5: AWS CLI v2 + configure

**Install** (check your CPU with `uname -m`):
```bash
# x86_64
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
# aarch64 (ARM): use this line instead
# curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o awscliv2.zip

unzip awscliv2.zip && sudo ./aws/install && rm -rf aws awscliv2.zip
```

**Configure** using the access key from Step 0.4:
```bash
aws configure
# AWS Access Key ID:     <from your CSV>
# AWS Secret Access Key: <from your CSV>
# Default region name:   ap-south-1
# Default output format: json
```

**Verify** that the CLI can reach your account:
```bash
aws --version                  # aws-cli/2.x
aws sts get-caller-identity    # shows your Account ID and .../user/workshop-admin
```

If the `Arn` ends in `:root`, you configured root keys by mistake. Delete them and use the `workshop-admin` keys instead.

> **Ask Claude:** "Install AWS CLI v2 on Ubuntu and help me run `aws configure`. Don't ask me to paste my secret key into the chat. `aws sts get-caller-identity` returns: <paste the error>."

---

## Step 6: Serverless Framework v3

**Why:** `serverless.yml`, `sls deploy`, `sls remove`, IAM role statements, and Cognito defined in YAML.

We use **Serverless Framework v3**. Install it with the `@3` tag. A plain `npm install -g serverless` installs v4, which we are **not** using.

```bash
npm install -g serverless@3
```

> v3 doesn't need a Serverless account or `serverless login`. It uses the AWS credentials you set up in Step 5.
> Don't use `sudo` with `npm install -g`. nvm installs global packages in your home folder.

**Verify:**
```bash
sls --version    # Framework Core: 3.x.x
```

If it shows `4.x`, remove it and install v3:
```bash
npm uninstall -g serverless && npm install -g serverless@3
```

> **Ask Claude:** "Install Serverless Framework v3 (not v4) globally with `npm install -g serverless@3`. `sls --version` shows: <paste>."

---

## Step 7: Docker Engine + Docker Compose

**Why:** Images, containers, Dockerfiles, layers, volumes, networks and `docker compose`. We also run Postgres locally in Docker.

Install from Docker's official apt repository. Don't use the `docker.io` package or the snap, because they don't include Compose v2.

```bash
# Remove old or conflicting packages (safe if none are installed)
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do sudo apt remove -y $pkg; done

# Add Docker's repository
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Run docker without sudo
sudo usermod -aG docker $USER
```

**Log out and log back in** (or reboot) so the group change applies.

> On Debian or Linux Mint, see https://docs.docker.com/engine/install/ for your distro's repository line.

**Verify:**
```bash
docker --version             # Docker version 2x.x
docker compose version       # Docker Compose version v2.x
docker run --rm hello-world  # prints "Hello from Docker!"
```

> **Ask Claude:** "Install Docker Engine and the Compose v2 plugin on Ubuntu from Docker's official repo. `docker run hello-world` fails with: <paste>."

---

## Step 8: PostgreSQL (in Docker) + a DB client

**Why:** Tables, keys, joins, indexes, Knex migrations and seeds, and transactions. We run Postgres in a container, so there's nothing to install on your machine except a client.

**Pull the image now** (it's big, so don't wait until the session):
```bash
docker pull postgres:16
```

**Quick test:**
```bash
docker run -d --name pg-test -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
sleep 5
docker exec -it pg-test psql -U postgres -c "SELECT version();"
docker rm -f pg-test
```

**Install a GUI client:**
```bash
sudo snap install dbeaver-ce
```
(pgAdmin also works: https://www.pgadmin.org/download/pgadmin-4-apt/)

**Verify:** the `SELECT version();` command above prints `PostgreSQL 16.x`.

> Knex is installed per project with `npm install knex pg` during the session. You don't need to install it globally.

---

## Step 9: MongoDB (in Docker) + MongoDB Compass

**Why:** Working with a document database alongside SQL. Like Postgres, MongoDB runs in a container, so the only thing you install on your machine is a GUI client.

**Pull the image now:**
```bash
docker pull mongo:8
```

**Quick test** (`mongosh`, the Mongo shell, is included in the image):
```bash
docker run -d --name mongo-test -p 27017:27017 mongo:8
sleep 5
docker exec -it mongo-test mongosh --quiet --eval "db.runCommand({ ping: 1 })"
docker rm -f mongo-test
```

**Install MongoDB Compass** (GUI client):
1. Download the **Ubuntu 64-bit (.deb)** package from https://www.mongodb.com/try/download/compass
2. Install it:
   ```bash
   sudo apt install ./mongodb-compass_*_amd64.deb
   ```

**Verify:** the `ping` command above prints `{ ok: 1 }`, and Compass opens.

> **Ask Claude:** "Pull the mongo:8 Docker image, run a test container, and ping it with mongosh. I get: <paste>."

---

## Step 10 (optional): Claude Code

If you want Claude to help directly in your terminal:
```bash
npm install -g @anthropic-ai/claude-code
claude
```
Follow the login prompt. Then, inside this folder, you can say: *"Read README.md and verify every step on my machine."*

---

## Step 11: Final check

Run this in your terminal. **Every line should show a version, and none should say MISSING.**

```bash
for c in "git --version" "node -v" "npm -v" "aws --version" "sls --version" \
         "docker --version" "docker compose version" "code --version"; do
  printf "%-24s " "${c%% *}"; $c 2>/dev/null | head -1 || echo "MISSING"
done
echo "---- AWS identity ----"
aws sts get-caller-identity --query Arn --output text || echo "AWS CLI NOT CONFIGURED"
echo "---- Docker ----"
docker run --rm hello-world >/dev/null 2>&1 && echo "Docker OK" || echo "Docker NOT RUNNING"
docker image inspect postgres:16 >/dev/null 2>&1 && echo "postgres:16 pulled" || echo "postgres:16 NOT PULLED"
docker image inspect mongo:8 >/dev/null 2>&1 && echo "mongo:8 pulled" || echo "mongo:8 NOT PULLED"
```

**Post a screenshot of this output in the session channel before Day 1.**

> **Ask Claude:** "Here's my final check output: <paste>. Fix whatever is missing."

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `nvm: command not found` | Close and reopen the terminal, or run `source ~/.bashrc`. |
| `npm install -g` gives `EACCES` | You're not using nvm's Node. Run `nvm use 22` and don't use `sudo` with npm. |
| `aws sts get-caller-identity` gives `InvalidClientTokenId` | The keys were copied wrong. Run `aws configure` again with the CSV values. |
| `docker: permission denied while trying to connect` | Run `sudo usermod -aG docker $USER`, then log out and back in. |
| `Cannot connect to the Docker daemon` | Run `sudo systemctl enable --now docker`. |
| Port `5432` already in use | A local Postgres is running. Run `sudo systemctl stop postgresql`, or use `-p 5433:5432`. |
| Port `27017` already in use | A local MongoDB is running. Run `sudo systemctl stop mongod`, or use `-p 27018:27017`. |
| `snap: command not found` | Run `sudo apt install -y snapd`, or use the `.deb` downloads from each tool's website. |
| AWS account still "pending" | Wait up to 24 hours, then check the email for verification steps. |

## Security rules (read these)

- Never commit AWS keys, `.env` files or `~/.aws/credentials` to Git.
- Never paste your **secret access key** into Claude, Slack or any chat.
- After each hands-on lab, run `sls remove` so nothing keeps running or billing.
- If a key leaks, go to **IAM → Users → workshop-admin → Security credentials** and **deactivate and delete** it right away.

## What each tool is for in the sessions

| Session topics | Tools |
|---|---|
| Naming, JSDoc, ESLint, TS basics, try/catch | VS Code, ESLint, Prettier, Node.js |
| HTTP, REST, status codes, pagination, OpenAPI | Bruno, OpenAPI extension |
| Lambda, API Gateway, serverless.yml, IAM, SSM, Joi, CloudWatch | AWS account, AWS CLI, Serverless Framework v3 |
| Cognito, OTP sign-in, tokens, authorizers, BOLA, S3 presigned URLs | AWS account, Bruno |
| Images, Dockerfiles, volumes, networks, compose | Docker Engine + Docker Compose |
| SQL, joins, indexes, Knex, transactions, RDS | PostgreSQL (Docker), DBeaver, Node.js |
| Document database basics | MongoDB (Docker), MongoDB Compass |
# backend-session
# backend-session
# backend-session
# backend-session
