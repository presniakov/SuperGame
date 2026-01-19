# How to Deploy SuperGame to a DigitalOcean Droplet

This guide assumes you have a **Fresh Ubuntu 24.04** (or 22.04) Droplet.

## 1. Initial Server Setup
Connect to your droplet via SSH:
```bash
ssh root@your_droplet_ip
```
Update packages:
```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Install Node.js, Nginx, and Git
Install the latest Node.js (via NodeSource) and Nginx:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
```
Verify installations:
```bash
node -v
npm -v
nginx -v
```

## 3. Clone Your Repository
Clone your project to `/var/www`. You might need to generate an SSH key (`ssh-keygen`) and add it to your GitHub/GitLab first.
```bash
mkdir -p /var/www/supergame
cd /var/www/supergame
# Replace with your actual repo URL
git clone <YOUR_REPO_URL> .
```

## 4. Backend Setup
Navigate to the server directory, install dependencies, build, and start.

### Install & Build
```bash
cd /var/www/supergame/server
npm install
npm run build
```

### Start with PM2 (Process Manager)
PM2 keeps your server running in the background and restarts it on crashes/reboots.
```bash
sudo npm install -g pm2
pm2 start dist/server.js --name "supergame-backend"
pm2 save
pm2 startup
```

## 5. Frontend Setup
Navigate to the client directory, install, and build the React app.

```bash
cd /var/www/supergame/client
npm install
npm run build
```
This ends with a `dist` folder (`/var/www/supergame/client/dist`) containing your static website.

## 6. Configure Nginx
Nginx will serve your React frontend and proxy WebSocket requests to your backend.

Create a new config file:
```bash
sudo nano /etc/nginx/sites-available/supergame
```

Paste the following configuration (Replace `your_domain_or_ip` with your actual Domain or Droplet IP):

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;

    root /var/www/supergame/client/dist;
    index index.html;

    # Serve React Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy Socket.io / API requests to Backend
    location /socket.io {
        proxy_pass http://localhost:4000; # Server runs on port 4000
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/supergame /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default page
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

## 7. Firewall Setup (UFW)
Allow SSH, HTTP, and HTTPS connections.
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 8. SSL with Certbot (Optional but Recommended)
If you have a domain name, secure it with HTTPS.
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

---

## 9. Creating a .env File
Don't forget to create your `.env` file for the backend!
```bash
cd /var/www/supergame/server
nano .env
```
Paste your environment variables (PORT=4000, etc.) and save. Restart the backend:
```bash
pm2 restart supergame-backend
```

**Done!** Your game should now be live at your IP or Domain.

---

## 10. Updating Your Site (After pulling new changes)
Every time you push changes to GitHub, follow these steps on your server to update the live site:

1. **Pull the latest code**:
   ```bash
   cd /var/www/supergame
   git pull
   ```

2. **Rebuild the Frontend** (if you changed React files):
   ```bash
   cd /var/www/supergame/client
   npm install      # In case you added new packages
   npm run build
   ```

3. **Rebuild the Backend** (if you changed Node/TS files):
   ```bash
   cd /var/www/supergame/server
   npm install      # In case you added new packages
   npm run build
   ```

4. **Restart the Server**:
   ```bash
   pm2 restart supergame-backend
   ```
