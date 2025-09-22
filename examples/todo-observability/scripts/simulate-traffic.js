const axios = require('axios');

const BASE_URL = process.env.TODO_APP_URL || 'http://localhost:3001';

async function createTask(title, description) {
  try {
    const response = await axios.post(`${BASE_URL}/api/tasks`, {
      title,
      description
    });
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error.message);
    return null;
  }
}

async function getTasks() {
  try {
    const response = await axios.get(`${BASE_URL}/api/tasks`);
    return response.data;
  } catch (error) {
    console.error('Error getting tasks:', error.message);
    return [];
  }
}

async function completeTask(taskId) {
  try {
    const response = await axios.put(`${BASE_URL}/api/tasks/${taskId}/complete`);
    return response.data;
  } catch (error) {
    console.error('Error completing task:', error.message);
    return null;
  }
}

async function deleteTask(taskId) {
  try {
    const response = await axios.delete(`${BASE_URL}/api/tasks/${taskId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting task:', error.message);
    return null;
  }
}

async function simulateError(type) {
  try {
    const response = await axios.post(`${BASE_URL}/api/simulate-error/${type}`);
    return response.data;
  } catch (error) {
    console.log(`Expected error for type ${type}:`, error.response?.status);
    return null;
  }
}

async function normalTraffic() {
  console.log('🟢 Generating normal traffic...');
  
  const tasks = [];
  for (let i = 1; i <= 5; i++) {
    const task = await createTask(
      `Task ${i} - ${new Date().toISOString()}`,
      `Description for task ${i}`
    );
    if (task) tasks.push(task);
    await sleep(200);
  }

  await getTasks();
  await sleep(300);

  for (let i = 0; i < Math.min(3, tasks.length); i++) {
    await completeTask(tasks[i].id);
    await sleep(150);
  }

  if (tasks.length > 0) {
    await deleteTask(tasks[tasks.length - 1].id);
  }

  console.log('✅ Normal traffic completed');
}

async function errorTraffic() {
  console.log('🔴 Generating error traffic...');
  
  await simulateError('db');
  await sleep(500);
  
  await simulateError('500');
  await sleep(500);
  
  await simulateError('timeout');
  await sleep(500);

  console.log('❌ Error traffic completed');
}

async function burstTraffic() {
  console.log('⚡ Generating burst traffic...');
  
  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(getTasks());
  }
  
  await Promise.all(promises);
  console.log('💥 Burst traffic completed');
}

async function slowTraffic() {
  console.log('🐌 Generating slow traffic...');
  
  for (let i = 0; i < 3; i++) {
    await simulateError('slow');
    await sleep(1000);
  }

  console.log('🐌 Slow traffic completed');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function continuousTraffic(durationMinutes = 2) {
  console.log(`🔄 Starting continuous traffic for ${durationMinutes} minutes...`);
  
  const endTime = Date.now() + (durationMinutes * 60 * 1000);
  
  while (Date.now() < endTime) {
    const scenario = Math.random();
    
    if (scenario < 0.6) {
      await normalTraffic();
    } else if (scenario < 0.8) {
      await burstTraffic();
    } else if (scenario < 0.9) {
      await slowTraffic();
    } else {
      await errorTraffic();
    }
    
    await sleep(2000);
  }
  
  console.log('🏁 Continuous traffic completed');
}

const args = process.argv.slice(2);
const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'normal';
const duration = parseInt(args.find(arg => arg.startsWith('--duration='))?.split('=')[1] || '2');
const requests = parseInt(args.find(arg => arg.startsWith('--requests='))?.split('=')[1] || '10');
const bursts = parseInt(args.find(arg => arg.startsWith('--bursts='))?.split('=')[1] || '1');

async function main() {
  console.log(`🌊 Hydropulse Traffic Simulator`);
  console.log(`📡 Target: ${BASE_URL}`);
  console.log(`🎯 Mode: ${mode}`);
  
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Connection to To-Do App successful');
  } catch (error) {
    console.error('❌ Cannot connect to To-Do App:', error.message);
    process.exit(1);
  }

  switch (mode) {
    case 'normal':
      await normalTraffic();
      break;
    case 'errors':
      await errorTraffic();
      break;
    case 'burst':
      for (let i = 0; i < bursts; i++) {
        console.log(`💥 Burst ${i + 1}/${bursts}`);
        await burstTraffic();
        if (i < bursts - 1) await sleep(3000);
      }
      break;
    case 'slow':
      await slowTraffic();
      break;
    case 'continuous':
      await continuousTraffic(duration);
      break;
    default:
      console.error('❌ Unknown mode. Available modes: normal, errors, burst, slow, continuous');
      process.exit(1);
  }
  
  console.log('🎉 Traffic simulation completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createTask,
  getTasks,
  completeTask,
  deleteTask,
  simulateError,
  normalTraffic,
  errorTraffic,
  burstTraffic,
  slowTraffic,
  continuousTraffic
};
