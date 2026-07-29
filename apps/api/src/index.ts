import dotenv from 'dotenv';
import { createApp } from './app';

dotenv.config();

const PORT = process.env.PORT || 3333;
const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 InfraField API Server running on port ${PORT}`);
  console.log(`📡 Health Check endpoint available at http://localhost:${PORT}/api/health`);
});
