#!/bin/bash
# Remove fetchWhatsappGroups
sed -i '/const fetchWhatsappGroups = async () => {/,/^  };/d' apps/web/src/pages/Settings.tsx

# Remove the Card Status block (approx 39 lines starting at {/\\* Card Status \\*/})
sed -i '/{\/\* Card Status \*\/}/,/<div className="settings-subpanel/!b;//!d' apps/web/src/pages/Settings.tsx
sed -i 's/<div className="settings-subpanel md:col-span-3/          {/* Seleção do Grupo de Destino */}\n          <div className="settings-subpanel md:col-span-3/g' apps/web/src/pages/Settings.tsx

# Remove Modal QR Code block
sed -i '/{\/\* Modal QR Code \*\/}/,/^    <\/div>/!b;//!d' apps/web/src/pages/Settings.tsx
# Put back the closing div
echo "    </div>" >> apps/web/src/pages/Settings.tsx
echo "  );" >> apps/web/src/pages/Settings.tsx
echo "};" >> apps/web/src/pages/Settings.tsx
