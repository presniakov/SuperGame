# SuperGame Deployment Guide

This guide outlines the professional approach to deploying your MERN stack application to a Digital Ocean Droplet (Ubuntu).

## 1. Preparation (Local Machine)
Before deploying, we need to prepare the application build artifacts.

### Frontend Build
Convert your React code into static HTML/CSS/JS files.
```bash
cd client
npm run build
# This creates a 'dist' folder containing your optimized app
```

### Backend Build
Compile TypeScript to JavaScript.
```bash
cd server
npm run build
# This creates a 'dist' folder containing the executable server.js
```

---

## 2. Server Setup (Digital Ocean Droplet)
SSH into your droplet: `ssh root@your_droplet_ip`

### Install Dependencies
```bash
# Update system
sudo apt update

# Install Node.js (v20+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
# (Follow official MongoDB docs for Ubuntu, or use MongoDB Atlas Cloud)

# Install PM2 (Process Manager to keep app running)
sudo npm install -g pm2

# Install Nginx (Web Server / Reverse Proxy)
sudo apt install -y nginx
```

---

## 3. Deployment Code

### Clone Repository
```bash
git clone https://github.com/your-user/supergame.git /var/www/supergame
```

### Setup Backend
```bash
cd /var/www/supergame/server
npm install --production
npm run build # If not committed to git

# Start with PM2
pm2 start dist/server.js --name "supergame-api"
pm2 save
pm2 startup
```

---

## 4. Nginx Configuration (The "Glue")
We use Nginx to serve the fast static frontend files and forward complex API/Socket requests to Node.js.

Edit config: `sudo nano /etc/nginx/sites-available/default`

```nginx
server {
    listen 80;
    server_name supergame.com; # Your domain or IP

    # 1. Serve Frontend (React)
    location / {
        root /var/www/supergame/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html; # Specific for React Router
    }

    # 2. Proxy API and WebSocket to Node.js
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
**Restart Nginx**: `sudo systemctl restart nginx`

---

## 5. Finalizing
1.  **Environment Variables**: Create a `.env` file in the server directory on the droplet with `MONGODB_URI` (production connection string) and secret keys.
2.  **SSL (HTTPS)**: Run `sudo apt install certbot python3-certbot-nginx` and then `sudo certbot --nginx` to auto-enable HTTPS.

## Summary
- **User** visits `supergame.com`.
- **Nginx** handles the request.
    - If it's a page load, it serves the React files immediately.
    - If it's a game socket connection, it seamlessly tunnels it to your Node.js server running on port 4000.

---

## 7. Troubleshooting

### Build Permission Denied (`sh: 1: tsc: Permission denied`)
If `npm run build` fails with permission errors, it means the executable bit is missing from the typescript binary, or ownership is mixed (root vs user).

**Fix 1: Add Execute Permission**
```bash
sudo chmod +x node_modules/.bin/tsc
```

**Fix 2: Fix Ownership (If you are not root)**
```bash
sudo chown -R $USER:$USER .
npm run build
```
