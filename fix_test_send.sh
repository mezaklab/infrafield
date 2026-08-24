#!/bin/bash
cat << 'INNER_EOF' > replacement.txt
  const handleTestSend = async () => {
    try {
      setTestingSend(true);
      const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID || settings.whatsapp_group_id || "-1000000000000";
      
      const payload = {
        chat_id: chatId,
        text: "✅ *Teste de comunicação do InfraField concluído com sucesso!*",
        parse_mode: "Markdown"
      };

      await axios.post('https://api.telegram.org/bot8960571150:AAGXe5lDDFwv-1H9kakK_QCPaDdsc6jGnDE/sendMessage', payload);
      
      setFeedback({ type: 'success', message: 'Mensagem de teste enviada com sucesso para o grupo do Telegram!' });
    } catch (err) {
      console.error('Erro no teste de envio do Telegram:', err);
      setFeedback({ type: 'error', message: 'Falha ao enviar mensagem de teste para o Telegram. Verifique se o bot está no grupo.' });
    } finally {
      setTestingSend(false);
    }
  };
INNER_EOF

# Replace handleTestSend block with the new one
sed -i '/const handleTestSend = async () => {/,/^  };/c\  const handleTestSend = async () => {\n    try {\n      setTestingSend(true);\n      const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID || settings.whatsapp_group_id || "-1000000000000";\n      \n      const payload = {\n        chat_id: chatId,\n        text: "✅ *Teste de comunicação do InfraField concluído com sucesso!*",\n        parse_mode: "Markdown"\n      };\n\n      await axios.post('\''https://api.telegram.org/bot8960571150:AAGXe5lDDFwv-1H9kakK_QCPaDdsc6jGnDE/sendMessage'\'', payload);\n      \n      setFeedback({ type: '\''success'\'', message: '\''Mensagem de teste enviada com sucesso para o grupo do Telegram!'\'' });\n    } catch (err) {\n      console.error('\''Erro no teste de envio do Telegram:'\'', err);\n      setFeedback({ type: '\''error'\'', message: '\''Falha ao enviar mensagem de teste para o Telegram. Verifique se o bot está no grupo.'\'' });\n    } finally {\n      setTestingSend(false);\n    }\n  };' apps/web/src/pages/Settings.tsx

