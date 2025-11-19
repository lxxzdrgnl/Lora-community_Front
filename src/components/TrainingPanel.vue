<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { api, type TrainingJobResponse } from '../services/api'; // Import TrainingJobResponse

interface TrainingPanelConfig {
  raw_dataset_path: string;
  output_dir: string;
  skip_preprocessing: boolean;
}

const config = ref<TrainingPanelConfig>({
  raw_dataset_path: './dataset',
  output_dir: 'my_lora_model',
  skip_preprocessing: false,
});

const isTraining = ref(false);
const statusMessage = ref('');
const currentEpoch = ref(0);
const totalEpochs = ref(0);
const currentStep = ref(0);
const totalSteps = ref(0);
const errorMessage = ref('');
const trainingJobId = ref<number | null>(null); // New ref for training job ID

let eventSource: EventSource | null = null;
let heartbeatTimer: number | null = null;
const HEARTBEAT_TIMEOUT = 60000; // 60초 동안 업데이트가 없으면 연결 끊김으로 간주

const startTraining = async () => {
  try {
    errorMessage.value = '';
    // TODO: Implement proper model creation and training job creation flow
    // For now, using a placeholder jobId and casting config for type compatibility
    if (trainingJobId.value === null) {
      // This part needs to be properly implemented to create a model and then a training job
      // For demonstration, let's assume a modelId of 1 and create a job
      const modelCreationResponse = await api.training.createModel({
        title: config.value.output_dir, // Using output_dir as title for now
        description: 'Training job created from UI',
        isPublic: false,
      });
      const modelId = modelCreationResponse.data.id;
      const jobCreationResponse = await api.training.createTrainingJob(modelId);
      trainingJobId.value = jobCreationResponse.data.id;
    }

    if (trainingJobId.value !== null) {
      const response = await api.training.startTraining(trainingJobId.value, {
        totalEpochs: 10,
        modelName: config.value.output_dir,
        trainingImageUrls: [], // Empty for now, needs proper implementation
      });
      statusMessage.value = response.message as string; // Assuming message is string
      isTraining.value = true;

      // Connect to SSE stream for real-time progress
      connectToStream();
    } else {
      errorMessage.value = 'Error: Could not obtain a training job ID.';
    }
  } catch (error) {
    errorMessage.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

const checkServerStatus = async () => {
  try {
    // TODO: This needs to be updated to get the actual jobId from somewhere
    // For now, using a placeholder jobId for type compatibility
    if (trainingJobId.value === null) {
      // Attempt to find an existing job or set a default for checking
      // This is a simplification and needs proper state management
      console.warn("No trainingJobId available for status check. Skipping.");
      return;
    }

    const response = await api.training.getTrainingJob(trainingJobId.value);
    const status = response.data; // Assuming response.data is TrainingJobResponse
    isTraining.value = status.status === 'RUNNING' || status.status === 'PENDING';
    statusMessage.value = `Job ${status.id}: ${status.status}`;

    // 서버가 학습 중이라면 SSE 연결 시작
    if (isTraining.value) {
      connectToStream();
    }
  } catch (error) {
    console.error('Failed to check server status:', error);
    errorMessage.value = 'Failed to connect to server or retrieve job status';
  }
};

const resetHeartbeat = () => {
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
  }

  heartbeatTimer = window.setTimeout(() => {
    // 60초 동안 업데이트가 없으면 연결 끊김
    handleConnectionLost();
  }, HEARTBEAT_TIMEOUT);
};

const handleConnectionLost = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }

  isTraining.value = false;
  errorMessage.value = 'Connection to server lost. The server may have been stopped.';
  statusMessage.value = 'Training interrupted - server connection lost';
};

const connectToStream = () => {
  // Close existing connection if any
  if (eventSource) {
    eventSource.close();
  }

  // Clear any existing heartbeat timer
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
  }

  errorMessage.value = '';

  // TODO: The SSE stream URL should ideally be dynamic or come from the API
  eventSource = new EventSource('http://127.0.0.1:8000/train/stream');

  eventSource.onopen = () => {
    console.log('SSE connection established');
    errorMessage.value = '';
    resetHeartbeat();
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      statusMessage.value = data.message || '';
      isTraining.value = data.status === 'TRAINING';

      // Reset heartbeat timer on every message
      resetHeartbeat();

      // Update progress information
      if (data.progress) {
        currentEpoch.value = data.progress.current_epoch || 0;
        totalEpochs.value = data.progress.total_epochs || 0;
        currentStep.value = data.progress.current_step || 0;
        totalSteps.value = data.progress.total_steps || 0;
      }

      // Close connection when training is complete or failed
      if (data.status === 'SUCCESS' || data.status === 'FAIL') {
        isTraining.value = false;
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (heartbeatTimer) {
          clearTimeout(heartbeatTimer);
          heartbeatTimer = null;
        }
      }
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    handleConnectionLost();
  };
};

// Check server status when component mounts
onMounted(() => {
  checkServerStatus();
});

// Cleanup on component unmount
onUnmounted(() => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }
});
</script>

<template>
  <div class="training-panel">
    <h2>LoRA Training</h2>

    <div class="form-group">
      <label for="dataset-path">Dataset Path:</label>
      <input
        id="dataset-path"
        v-model="config.raw_dataset_path"
        type="text"
        placeholder="./dataset"
        :disabled="isTraining"
      />
    </div>

    <div class="form-group">
      <label for="output-dir">Output Directory:</label>
      <input
        id="output-dir"
        v-model="config.output_dir"
        type="text"
        placeholder="my_lora_model"
        :disabled="isTraining"
      />
    </div>

    <div class="form-group checkbox">
      <label>
        <input
          v-model="config.skip_preprocessing"
          type="checkbox"
          :disabled="isTraining"
        />
        Skip Preprocessing
      </label>
    </div>

    <button
      class="btn btn-primary"
      @click="startTraining"
      :disabled="isTraining"
    >
      {{ isTraining ? 'Training...' : 'Start Training' }}
    </button>

    <div v-if="statusMessage" class="status-message" :class="{ active: isTraining }">
      {{ statusMessage }}
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <!-- Progress Bars -->
    <div v-if="isTraining && totalEpochs > 0" class="progress-section">
      <div class="progress-item">
        <div class="progress-label">
          <span>Epoch Progress</span>
          <span class="progress-text">{{ currentEpoch }} / {{ totalEpochs }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${(currentEpoch / totalEpochs) * 100}%` }"
          ></div>
        </div>
      </div>

      <div class="progress-item" v-if="totalSteps > 0">
        <div class="progress-label">
          <span>Step Progress</span>
          <span class="progress-text">{{ currentStep }} / {{ totalSteps }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill secondary"
            :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.training-panel {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border: 1px solid #2a2a3e;
}

h2 {
  margin-top: 0;
  margin-bottom: 28px;
  color: #e0e0e0;
  font-size: 28px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #b0b0c0;
  font-size: 15px;
}

.form-group.checkbox label {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #b0b0c0;
}

.form-group.checkbox input {
  margin-right: 10px;
  width: auto;
  cursor: pointer;
  width: 18px;
  height: 18px;
  accent-color: #6366f1;
}

input[type="text"] {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  font-size: 15px;
  box-sizing: border-box;
  transition: all 0.2s;
  background: #0f0f1e;
  color: #e0e0e0;
}

input[type="text"]:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

input[type="text"]:disabled {
  background: #1a1a2e;
  cursor: not-allowed;
  opacity: 0.5;
}

.btn {
  padding: 16px 32px;
  border: none;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.btn-primary:disabled {
  background: #2a2a3e;
  color: #606070;
  cursor: not-allowed;
  box-shadow: none;
}

.status-message {
  margin-top: 20px;
  padding: 16px;
  background: rgba(99, 102, 241, 0.1);
  border-left: 4px solid #6366f1;
  border-radius: 8px;
  color: #a5b4fc;
  font-size: 15px;
}

.status-message.active {
  background: rgba(251, 191, 36, 0.1);
  border-left-color: #fbbf24;
  color: #fcd34d;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.error-message {
  margin-top: 20px;
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  color: #fca5a5;
  font-size: 15px;
}

.progress-section {
  margin-top: 24px;
  padding: 20px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.progress-item {
  margin-bottom: 20px;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #b0b0c0;
  font-size: 14px;
  font-weight: 600;
}

.progress-text {
  color: #6366f1;
  font-weight: 700;
}

.progress-bar {
  width: 100%;
  height: 24px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  border-radius: 12px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

.progress-fill.secondary {
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
