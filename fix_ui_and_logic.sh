#!/bin/bash

# 1. Import axios
sed -i '1i import axios from "axios";' apps/web/src/pages/Settings.tsx

# 2. Replace Telegram UI
cat << 'INNER_EOF' > telegram_ui.txt
          <div className="settings-subpanel md:col-span-3 rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="if-text-secondary text-xs font-bold tracking-wide">
                  Grupo de Destino dos Alertas
                </label>
              </div>

              <a
                href="https://t.me/infrafield_alertas_bot?startgroup=true"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-11 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Vincular Grupo do Telegram
              </a>

              <p className="if-text-secondary text-xs mt-3 leading-relaxed">
                Clique no botão para adicionar o bot ao grupo desejado. O sistema registrará automaticamente o ID do grupo assim que você enviar a primeira mensagem lá dentro.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
              <button
                onClick={handleTestSend}
                disabled={testingSend}
                className="if-button-secondary min-h-10 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs disabled:opacity-50"
              >
                {testingSend ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Testar Envio</span>
              </button>
            </div>
          </div>
INNER_EOF

# The block to replace is lines 420 to 474 (the settings-subpanel)
sed -i '/<div className="settings-subpanel md:col-span-2/,/<\/div>\n          <\/div>\n        <\/div>\n      <\/section>/!b;//!d' apps/web/src/pages/Settings.tsx

