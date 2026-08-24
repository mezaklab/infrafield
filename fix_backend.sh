#!/bin/bash
# Remove whatsappRouter from settings.routes.ts
sed -i '/export const whatsappRouter = Router();/,$d' apps/api/src/routes/settings.routes.ts
sed -i '/import { sendWhatsAppText }/d' apps/api/src/routes/settings.routes.ts
sed -i '/import axios from '\''axios'\'';/d' apps/api/src/routes/settings.routes.ts
sed -i '/import QRCode from '\''qrcode'\'';/d' apps/api/src/routes/settings.routes.ts

# Remove whatsappRouter from routes/index.ts
sed -i 's/, whatsappRouter//g' apps/api/src/routes/index.ts
sed -i '/whatsappRouter/d' apps/api/src/routes/index.ts

