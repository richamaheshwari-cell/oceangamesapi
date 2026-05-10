# Deploy TOG Backend to VPS (api.theoceangame.com)

Step-by-step guide to deploy this Node.js backend on a VPS, connect it to GitHub, and serve it at **https://api.theoceangame.com**.

---

## What you need

- A VPS (Ubuntu 22.04 LTS recommended) with SSH access
- A domain pointed to your VPS: **api.theoceangame.com** → your server’s public IP
- This repo pushed to **GitHub** (public or private; you’ll use git clone)

---

## Part 1: Point the domain to your VPS

1. In your domain registrar (where you bought the domain), add an **A record**:
   - **Name/host:** `api` (or `api.theoceangame` depending on the panel)
   - **Value:** your VPS **public IP**
   - TTL: 300 or default
2. Wait 5–60 minutes for DNS to propagate. Check with:
   ```bash
   ping api.theoceangame.com
   ```
   It should resolve to your VPS IP.

---

## Part 2: First-time VPS setup (SSH in)

1. SSH into the VPS (replace with your IP and user; often `root` or `ubuntu`):
   ```bash
   ssh root@YOUR_VPS_IP
   ```
2. Update the system:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## Part 3: Install Node.js, PostgreSQL, Git, Nginx

Run on the VPS:

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Git and Nginx
sudo apt install -y git nginx
```

Verify:

```bash
node -v   # v20.x
npm -v
psql --version
nginx -v
```

---

## Part 4: PostgreSQL database

1. Switch to the postgres user and create a DB and user:
   ```bash
   sudo -u postgres psql
   ```
2. In the `psql` prompt:
   ```sql
   CREATE USER tog_user WITH PASSWORD 'your_strong_password_here';
   CREATE DATABASE tog_db OWNER tog_user;
   \q
   ```
3. (Optional) Allow local connections: edit `/etc/postgresql/14/main/pg_hba.conf` (version number may differ) and ensure you have a line like:
   ```
   local   all   tog_user   md5
   ```
   Then:
   ```bash
   sudo systemctl restart postgresql
   ```
   Your `DATABASE_URL` will be:
   ```
   postgresql://tog_user:your_strong_password_here@localhost:5432/tog_db?schema=public
   ```

---

## Part 5: App directory and clone from GitHub

1. Create a directory and clone (use your repo URL; HTTPS or SSH):
   ```bash
   sudo mkdir -p /var/www
   sudo chown $USER:$USER /var/www
   cd /var/www
   git clone https://github.com/YOUR_USERNAME/tog_backend.git
   cd tog_backend
   ```
2. Install dependencies:
   ```bash
   npm install --production
   ```
3. Create `.env` on the server (do **not** commit this file):
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set at least:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `DATABASE_URL=postgresql://tog_user:your_strong_password_here@localhost:5432/tog_db?schema=public`
   - `ACCESS_TOKEN_SECRET=...` (long random string)
   - `REFRESH_TOKEN_SECRET=...` (long random string)
   - `CORS_ORIGIN=https://theoceangame.com,https://www.theoceangame.com` (your frontend origins, comma-separated)
   - For uploads and links: `BASE_URL=https://api.theoceangame.com`
   - Add other variables from `.env.example` (SMTP, newsletter, etc.) as needed.
4. Run Prisma migrations and generate client:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
5. (Optional) Create super admin:
   ```bash
   node src/scripts/createAdmin.js
   ```
   Ensure `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in `.env`.

---

## Part 6: Run the app with PM2

1. Install PM2 globally:
   ```bash
   sudo npm install -g pm2
   ```
2. Start the app:
   ```bash
   cd /var/www/tog_backend
   pm2 start src/server.js --name tog-backend
   ```
3. Make it start on reboot:
   ```bash
   pm2 startup
   pm2 save
   ```
4. Check:
   ```bash
   pm2 status
   pm2 logs tog-backend
   ```
   The API should respond on the server at `http://localhost:3000`. Test:
   ```bash
   curl http://localhost:3000/health
   ```

---

## Part 7: Nginx reverse proxy (api.theoceangame.com)

Nginx will receive requests for **api.theoceangame.com** and forward them to your Node app on port 3000.

1. Create a config file:
   ```bash
   sudo nano /etc/nginx/sites-available/tog-backend
   ```
2. Paste this (replace **api.theoceangame.com** if your domain is different):

   ```nginx
   server {
       listen 80;
       server_name api.theoceangame.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           proxy_read_timeout 90s;
           proxy_connect_timeout 90s;
           proxy_send_timeout 90s;
       }

       client_max_body_size 10M;
   }
   ```

3. Enable the site and test Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/tog-backend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. From your laptop, open **http://api.theoceangame.com/health** in a browser or:
   ```bash
   curl http://api.theoceangame.com/health
   ```
   You should get `{"ok":true,...}`.

---

## Part 8: SSL (HTTPS) with Let’s Encrypt

1. Install Certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```
2. Get a certificate (Certbot will adjust your Nginx config):
   ```bash
   sudo certbot --nginx -d api.theoceangame.com
   ```
   Follow the prompts (email, agree to terms). Choose “Redirect” so HTTP is redirected to HTTPS.
3. Test auto-renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

Your API will be available at **https://api.theoceangame.com**.

---

## Part 9: Production .env checklist

On the server, ensure `.env` includes:

| Variable | Example / note |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | `postgresql://tog_user:...@localhost:5432/tog_db?schema=public` |
| `ACCESS_TOKEN_SECRET` | Long random string |
| `REFRESH_TOKEN_SECRET` | Long random string |
| `CORS_ORIGIN` | `https://theoceangame.com,https://www.theoceangame.com` |
| `BASE_URL` | `https://api.theoceangame.com` |
| `NEWSLETTER_SITE_URL` | `https://theoceangame.com` (or your frontend URL) |
| `RESET_PASSWORD_LINK_BASE` | `https://admin.theoceangame.com` (or your admin app URL) |
| SMTP / newsletter vars | As needed for email |

---

## Where uploaded images are stored

When you deploy to the VPS, images uploaded via the admin (e.g. **POST /admin/upload/image**) are saved on the server filesystem:

| What | Path on VPS |
|------|------------------|
| **Folder** | `uploads/images/` inside the app directory |
| **Full path** | `/var/www/tog_backend/uploads/images/` |

- The app creates `uploads/images/` automatically on the first upload (you don’t need to create it).
- Files are served by Express at **/uploads/images/** and are publicly reachable at:
  - **https://api.theoceangame.com/uploads/images/<filename>**
- The `uploads/` folder is in `.gitignore`, so it is **not** in GitHub. Anything you upload on the VPS stays only on the VPS.
- **Backup:** If you need to keep uploads safe, back up `/var/www/tog_backend/uploads/` (e.g. with a cron job or your host’s backup tool). If you redeploy from git or move servers, copy this folder to the new app directory.

---

## Part 10: Deploy updates from GitHub

When you push new code, on the VPS:

```bash
cd /var/www/tog_backend
git pull origin main
npm install --production
npx prisma migrate deploy
npx prisma generate
pm2 restart tog-backend
```

(Use your default branch name if it’s not `main`.)

---

## Quick reference

| Step | Command / action |
|------|-------------------|
| Log in | `ssh root@YOUR_VPS_IP` |
| App path | `/var/www/tog_backend` |
| Start app | `pm2 start src/server.js --name tog-backend` |
| Restart | `pm2 restart tog-backend` |
| Logs | `pm2 logs tog-backend` |
| Nginx reload | `sudo systemctl reload nginx` |
| API URL | **https://api.theoceangame.com** |

---

## Troubleshooting

- **502 Bad Gateway:** App not running or wrong port. Check `pm2 status` and `pm2 logs tog-backend`; ensure `PORT=3000` in `.env` and Nginx proxies to `127.0.0.1:3000`.
- **CORS errors:** Add your frontend origin(s) to `CORS_ORIGIN` in `.env` and restart PM2.
- **DB connection failed:** Check `DATABASE_URL`, PostgreSQL is running (`sudo systemctl status postgresql`), and user/password/database exist.
- **SSL not working:** Ensure DNS for `api.theoceangame.com` points to this VPS and run `sudo certbot --nginx -d api.theoceangame.com` again.

Once this is done, your backend is served at **https://api.theoceangame.com** and treats that as its host (e.g. for upload URLs if you use `BASE_URL`).
