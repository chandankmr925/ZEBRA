# Deploy ZEBRA on Oracle Cloud Always Free VM

This guide runs ZEBRA on an **Oracle Cloud free Ampere/AMD VM** with persistent disk for user accounts and portfolios.

## 1. Create the VM (Oracle Cloud Console)

1. Sign up at [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
2. **Compute → Instances → Create instance**
   - **Name:** `zebra`
   - **Image:** Ubuntu 22.04 or 24.04 (aarch64 Ampere is fine)
   - **Shape:** Ampere A1.Flex — **1 OCPU, 6 GB RAM** (always free eligible)
   - **Boot volume:** 50 GB (default is fine)
   - **Networking:** assign a public IPv4 address
   - **SSH keys:** upload your public key (or generate and download the private key)
3. Click **Create**.

## 2. Open firewall ports (required)

In the Oracle Console:

1. **Networking → Virtual cloud networks** → your VCN → **Security Lists** → Default Security List
2. **Add Ingress Rules:**
   | Source | Protocol | Dest port | Description |
   |--------|----------|-----------|-------------|
   | `0.0.0.0/0` | TCP | 22 | SSH |
   | `0.0.0.0/0` | TCP | 80 | HTTP |
   | `0.0.0.0/0` | TCP | 443 | HTTPS (optional) |

Without this step the VM will not respond on port 80 from the internet.

## 3. SSH into the VM

```bash
ssh -i /path/to/your-key.pem ubuntu@<PUBLIC_IP>
```

Oracle Ubuntu images use user `ubuntu`. For Oracle Linux use `opc`.

## 4. Run the setup script

**Option A — one-liner (from GitHub):**

```bash
curl -fsSL https://raw.githubusercontent.com/chandankmr925/ZEBRA/main/deploy/oracle-cloud/setup.sh | bash
```

**Option B — clone first:**

```bash
git clone https://github.com/chandankmr925/ZEBRA.git
cd ZEBRA
chmod +x deploy/oracle-cloud/*.sh
./deploy/oracle-cloud/setup.sh
```

The script will:

- Install Node.js 20, nginx, git
- Clone the app to `/opt/zebra`
- Build the frontend (`npm run build`)
- Create a `zebra` system user
- Start **systemd** service `zebra` (port 4173)
- Proxy **nginx** on port 80 → Node
- Enable **ufw** (SSH + HTTP/HTTPS)

## 5. Open the app

Visit:

```
http://<PUBLIC_IP>
```

Create an account on the login screen. Each user’s portfolios are stored under:

```
/opt/zebra/data/users/
```

## 6. Optional configuration

Edit environment variables:

```bash
sudo nano /etc/zebra/zebra.env
```

| Variable | Purpose |
|----------|---------|
| `PORT` | Node listen port (default `4173`) |
| `OPENAI_API_KEY` | Optional LLM narratives |

Restart after changes:

```bash
sudo systemctl restart zebra
```

## 7. HTTPS with a domain (optional)

Point your domain’s **A record** to the VM public IP, then:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d zebra.yourdomain.com
```

## 8. Updates

After you push changes to GitHub:

```bash
sudo -u zebra /opt/zebra/deploy/oracle-cloud/deploy.sh
```

Or manually:

```bash
cd /opt/zebra
git pull
npm install && npm run build
sudo systemctl restart zebra
```

## Useful commands

```bash
sudo systemctl status zebra      # app status
sudo journalctl -u zebra -f      # live logs
sudo systemctl restart zebra     # restart app
sudo systemctl restart nginx     # restart proxy
curl http://127.0.0.1:4173/api/health   # health check
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Browser timeout on port 80 | Add ingress rules in Oracle **Security List** (step 2) |
| `502 Bad Gateway` | `sudo systemctl status zebra` — run `npm run build` in `/opt/zebra` |
| Scan fails | Ensure outbound HTTPS is allowed (default) for Yahoo Finance |
| Data lost after reboot | Data is on boot volume — should persist; avoid recreating the VM without backup |

## Cost

Ampere A1 (1 OCPU / 6 GB) and 50 GB boot volume are **Always Free** within Oracle Free Tier limits. No credit card charges if you stay within free allowance.

## Security notes

- Change default SSH access: use keys only, disable password auth
- This auth system is for small teams — use HTTPS in production
- Back up `/opt/zebra/data/` periodically
