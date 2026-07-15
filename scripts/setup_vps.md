# VPS setup

Актуальная инструкция по Docker-деплою АгроДеск: **[docs/DEPLOY.md](../docs/DEPLOY.md)**.

Кратко:

```bash
cd /opt/agrodesk
cp .env.production.example .env.production
# заполните секреты
./deploy.sh
# UI: http://213.183.104.142:3010
```
