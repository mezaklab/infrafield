#!/bin/bash
# Remove handleGenerateQrCode (lines 145 to 178) and handleSaveSettings (lines 180 to 195)
# Note: line numbers might shift. It's better to use regex ranges.

sed -i '/const handleGenerateQrCode = async () => {/,/^  };/d' apps/web/src/pages/Settings.tsx
sed -i '/const handleSaveSettings = async () => {/,/^  };/d' apps/web/src/pages/Settings.tsx
sed -i '/const handleResetInstance = async () => {/,/^  };/d' apps/web/src/pages/Settings.tsx

