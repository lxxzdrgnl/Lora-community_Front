<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../services/api';

const modelId = ref(1);
const prompt = ref('a beautiful anime girl');
const negativePrompt = ref('bad quality');
const steps = ref(30);
const guidanceScale = ref(7.5);
const numImages = ref(1);
const seed = ref<number | undefined>(undefined);

const result = ref<string>('');
const error = ref<string>('');
const isLoading = ref(false);

const testGeneration = async () => {
  isLoading.value = true;
  result.value = '';
  error.value = '';

  try {
    const payload = {
      modelId: modelId.value,
      prompt: prompt.value,
      negativePrompt: negativePrompt.value,
      steps: steps.value,
      guidanceScale: guidanceScale.value,
      numImages: numImages.value,
      seed: seed.value,
    };

    console.log('=== Testing Generation ===');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await api.generation.generateImage(payload);

    console.log('Response:', response);
    result.value = JSON.stringify(response, null, 2);
  } catch (err) {
    console.error('Error:', err);
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    isLoading.value = false;
  }
};

const testSimpleRequest = async () => {
  isLoading.value = true;
  result.value = '';
  error.value = '';

  try {
    const token = localStorage.getItem('accessToken');
    console.log('Token:', token ? 'Present' : 'Missing');

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        modelId: modelId.value,
        prompt: prompt.value,
        steps: 20,
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);

    const text = await response.text();
    console.log('Response text:', text);

    if (!response.ok) {
      error.value = `HTTP ${response.status}: ${text}`;
    } else {
      result.value = text;
    }
  } catch (err) {
    console.error('Error:', err);
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="container-sm" style="padding: 40px 20px;">
    <h1 class="text-3xl font-bold mb-lg">Generation Debug</h1>

    <div class="card mb-lg">
      <h2 class="text-xl font-bold mb-md">Request Parameters</h2>

      <div class="form-group">
        <label class="label">Model ID</label>
        <input v-model.number="modelId" type="number" class="input" />
      </div>

      <div class="form-group">
        <label class="label">Prompt</label>
        <input v-model="prompt" type="text" class="input" />
      </div>

      <div class="form-group">
        <label class="label">Negative Prompt</label>
        <input v-model="negativePrompt" type="text" class="input" />
      </div>

      <div class="grid grid-cols-2 gap-md">
        <div class="form-group">
          <label class="label">Steps</label>
          <input v-model.number="steps" type="number" class="input" />
        </div>

        <div class="form-group">
          <label class="label">Guidance Scale</label>
          <input v-model.number="guidanceScale" type="number" step="0.1" class="input" />
        </div>

        <div class="form-group">
          <label class="label">Num Images</label>
          <input v-model.number="numImages" type="number" class="input" />
        </div>

        <div class="form-group">
          <label class="label">Seed (optional)</label>
          <input v-model.number="seed" type="number" class="input" placeholder="Random" />
        </div>
      </div>

      <div class="flex gap-md mt-lg">
        <button
          @click="testGeneration"
          :disabled="isLoading"
          class="btn btn-primary flex-1"
        >
          Test with API Service
        </button>
        <button
          @click="testSimpleRequest"
          :disabled="isLoading"
          class="btn btn-secondary flex-1"
        >
          Test with Raw Fetch
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="card mb-lg">
      <p class="text-center">Loading...</p>
    </div>

    <div v-if="error" class="card mb-lg" style="background: rgba(239, 68, 68, 0.1);">
      <h3 class="text-lg font-bold mb-sm" style="color: #ef4444;">Error</h3>
      <pre style="white-space: pre-wrap; word-wrap: break-word; color: #ef4444;">{{ error }}</pre>
    </div>

    <div v-if="result" class="card">
      <h3 class="text-lg font-bold mb-sm" style="color: #10b981;">Success</h3>
      <pre style="white-space: pre-wrap; word-wrap: break-word;">{{ result }}</pre>
    </div>

    <div class="card mt-lg">
      <h3 class="text-lg font-bold mb-sm">Instructions</h3>
      <ul style="list-style: disc; padding-left: 20px;">
        <li>Open browser DevTools (F12) → Console tab</li>
        <li>Open Network tab to see request/response details</li>
        <li>Click "Test with API Service" to use the normal flow</li>
        <li>Click "Test with Raw Fetch" to see raw response</li>
        <li>Check console logs for detailed information</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
pre {
  background: var(--bg-secondary);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.5;
}
</style>
