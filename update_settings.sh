#!/bin/bash
# Re-apply all changes to Settings.tsx

# 1. Import axios
sed -i '1i import axios from "axios";' apps/web/src/pages/Settings.tsx

# 2. Fix the state variables
sed -i '/const \[groups, setGroups\] = useState/d' apps/web/src/pages/Settings.tsx
sed -i '/const \[loadingGroups, setLoadingGroups\] = useState/d' apps/web/src/pages/Settings.tsx
sed -i '/const \[qrCodeUrl, setQrCodeUrl\] = useState/d' apps/web/src/pages/Settings.tsx
sed -i '/const \[loadingQr, setLoadingQr\] = useState/d' apps/web/src/pages/Settings.tsx
sed -i '/const isConnected = /d' apps/web/src/pages/Settings.tsx
sed -i '/const \[resettingInstance, setResettingInstance\] = useState/d' apps/web/src/pages/Settings.tsx
sed -i '/const \[isQrModalOpen, setIsQrModalOpen\] = useState/d' apps/web/src/pages/Settings.tsx
sed -i '/const \[savingSettings, setSavingSettings\] = useState/d' apps/web/src/pages/Settings.tsx

# 3. Fix the useEffect fetchers
sed -i '/fetchWhatsappGroups();/d' apps/web/src/pages/Settings.tsx

# 4. Remove unused imports
sed -i 's/QrCode,//g; s/Wifi,//g; s/WifiOff,//g; s/RotateCcw,//g' apps/web/src/pages/Settings.tsx

# 5. Remove unused interface
sed -i '/interface WhatsAppGroup {/,/}/d' apps/web/src/pages/Settings.tsx

