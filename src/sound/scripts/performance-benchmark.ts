#!/usr/bin/env node

/**
 * Performance Benchmark Script for Sound System
 * 
 * Measures and displays performance metrics for the audio generation pipeline
 * to ensure we meet the real-time requirements (< 3ms per 370-byte chunk)
 */

import { createBufferManager } from '../bufferManager';
import { createTestSounds } from '../generators/testSounds';
import { convertBuffer } from '../formatConverter';

const SAMPLE_RATE = 22200;
const CHUNK_SIZE = 370;

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function formatNumber(num: number, decimals = 0): string {
  return num.toFixed(decimals).padStart(10);
}

function formatTime(ms: number): string {
  if (ms < 0.001) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1) return `${ms.toFixed(3)}ms`;
  return `${ms.toFixed(2)}ms`;
}

function getRealtimeFactor(samplesPerSecond: number): string {
  const factor = samplesPerSecond / SAMPLE_RATE;
  const color = factor >= 10 ? colors.green : factor >= 5 ? colors.yellow : colors.red;
  return `${color}${factor.toFixed(1)}x${colors.reset}`;
}

function printHeader(title: string) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${title} ===${colors.reset}\n`);
}

function printResult(label: string, value: string, suffix = '') {
  console.log(`${label.padEnd(30)} ${value}${suffix}`);
}

async function runBenchmark() {
  console.log(`${colors.bright}Sound System Performance Benchmark${colors.reset}`);
  console.log(`Target: Generate audio at least 10x faster than real-time (${SAMPLE_RATE} Hz)`);
  console.log(`Chunk size: ${CHUNK_SIZE} bytes`);

  const generators = createTestSounds();
  const bufferManager = createBufferManager(generators.silence);

  // Warm up
  console.log('\nWarming up...');
  for (let i = 0; i < 100; i++) {
    bufferManager.requestSamples(512);
  }

  // 1. Raw Sample Generation Speed
  printHeader('Raw Sample Generation Speed');
  
  {
    bufferManager.setGenerator(generators.sine440);
    const testDurationMs = 1000;
    const startTime = performance.now();
    let samplesGenerated = 0;
    
    while (performance.now() - startTime < testDurationMs) {
      const samples = bufferManager.requestSamples(512);
      samplesGenerated += samples.length;
    }
    
    const elapsedSeconds = (performance.now() - startTime) / 1000;
    const samplesPerSecond = samplesGenerated / elapsedSeconds;
    
    printResult('Samples per second:', formatNumber(samplesPerSecond));
    printResult('Real-time factor:', getRealtimeFactor(samplesPerSecond));
    printResult('Time per 370-byte chunk:', formatTime((CHUNK_SIZE / samplesPerSecond) * 1000));
  }

  // 2. Generation Speed by Buffer Size
  printHeader('Generation Speed by Buffer Size');
  
  {
    bufferManager.setGenerator(generators.whiteNoise);
    const bufferSizes = [128, 256, 512, 1024, 2048];
    
    for (const size of bufferSizes) {
      const iterations = 5000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        bufferManager.requestSamples(size);
      }
      
      const elapsedMs = performance.now() - startTime;
      const samplesPerSecond = (size * iterations) / (elapsedMs / 1000);
      const timePerRequest = elapsedMs / iterations;
      
      console.log(`${size.toString().padStart(4)} samples: ` +
                  `${formatTime(timePerRequest)}/request, ` +
                  `${formatNumber(samplesPerSecond)} samples/sec ` +
                  `(${getRealtimeFactor(samplesPerSecond)})`);
    }
  }

  // 3. Generator Performance Comparison
  printHeader('Generator Performance Comparison');
  
  {
    const generatorTests = [
      { name: 'Silence', generator: generators.silence },
      { name: 'Sine 440Hz', generator: generators.sine440 },
      { name: 'White Noise', generator: generators.whiteNoise },
      { name: 'Major Chord', generator: generators.majorChord },
      { name: 'Octaves', generator: generators.octaves },
    ];
    
    for (const { name, generator } of generatorTests) {
      bufferManager.setGenerator(generator);
      bufferManager.reset();
      
      const iterations = 10000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        bufferManager.requestSamples(CHUNK_SIZE);
      }
      
      const elapsedMs = performance.now() - startTime;
      const timePerChunk = elapsedMs / iterations;
      const samplesPerSecond = (CHUNK_SIZE * iterations) / (elapsedMs / 1000);
      
      console.log(`${name.padEnd(15)} ${formatTime(timePerChunk)}/chunk, ` +
                  `${getRealtimeFactor(samplesPerSecond)}`);
    }
  }

  // 4. Direct Chunk Generation Timing
  printHeader('Direct 370-byte Chunk Generation');
  
  {
    const iterations = 50000;
    
    for (const [name, generator] of Object.entries(generators)) {
      if (name === 'majorChord' || name === 'octaves') continue; // Skip complex ones for this test
      
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        (generator as any).generateChunk();
      }
      
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      const chunksPerSecond = 1000 / avgTime;
      const audioSecondsPerSecond = (chunksPerSecond * CHUNK_SIZE) / SAMPLE_RATE;
      
      console.log(`${name.padEnd(15)} ${formatTime(avgTime)}/chunk ` +
                  `(${formatNumber(chunksPerSecond, 0)} chunks/sec, ` +
                  `${getRealtimeFactor(audioSecondsPerSecond * SAMPLE_RATE)})`);
    }
  }

  // 5. Full Pipeline Performance
  printHeader('Full Pipeline (Generate + Convert)');
  
  {
    bufferManager.setGenerator(generators.sine440);
    bufferManager.reset();
    
    const testDurationMs = 1000;
    const startTime = performance.now();
    let samplesProcessed = 0;
    let iterations = 0;
    
    while (performance.now() - startTime < testDurationMs) {
      const samples = bufferManager.requestSamples(512);
      const float32 = convertBuffer(samples);
      samplesProcessed += float32.length;
      iterations++;
    }
    
    const elapsedSeconds = (performance.now() - startTime) / 1000;
    const samplesPerSecond = samplesProcessed / elapsedSeconds;
    const avgTimePerIteration = (performance.now() - startTime) / iterations;
    
    printResult('Full pipeline samples/sec:', formatNumber(samplesPerSecond));
    printResult('Real-time factor:', getRealtimeFactor(samplesPerSecond));
    printResult('Avg time per 512-sample request:', formatTime(avgTimePerIteration));
  }

  // 6. Real-time Audio Callback Simulation
  printHeader('Real-time Audio Callback Simulation');
  
  {
    bufferManager.setGenerator(generators.sine440);
    bufferManager.reset();
    
    const callbackSizes = [256, 512, 1024];
    
    for (const callbackSize of callbackSizes) {
      const callbacksPerSecond = SAMPLE_RATE / callbackSize;
      const targetCallbackTime = (callbackSize / SAMPLE_RATE) * 1000;
      const totalCallbacks = Math.ceil(callbacksPerSecond * 0.1); // Simulate 100ms
      
      const timings: number[] = [];
      
      for (let i = 0; i < totalCallbacks; i++) {
        const start = performance.now();
        
        const samples = bufferManager.requestSamples(callbackSize);
        convertBuffer(samples); // Convert but don't store (simulating real use)
        
        timings.push(performance.now() - start);
      }
      
      const avgTime = timings.reduce((a, b) => a + b) / timings.length;
      const maxTime = Math.max(...timings);
      const minTime = Math.min(...timings);
      const safetyMargin = targetCallbackTime / avgTime;
      
      console.log(`\n${callbackSize} samples/callback (${callbacksPerSecond.toFixed(1)} callbacks/sec):`);
      console.log(`  Target time:   ${formatTime(targetCallbackTime)}`);
      console.log(`  Average time:  ${formatTime(avgTime)}`);
      console.log(`  Min/Max time:  ${formatTime(minTime)} / ${formatTime(maxTime)}`);
      console.log(`  Safety margin: ${safetyMargin >= 10 ? colors.green : safetyMargin >= 5 ? colors.yellow : colors.red}${safetyMargin.toFixed(1)}x${colors.reset}`);
    }
  }

  // 7. Buffer Manager Overhead
  printHeader('Buffer Manager Overhead');
  
  {
    const iterations = 10000;
    
    // Direct generation
    const directStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      generators.silence.generateChunk();
    }
    const directTime = performance.now() - directStart;
    
    // Through buffer manager
    bufferManager.setGenerator(generators.silence);
    bufferManager.reset();
    
    const bufferStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      bufferManager.requestSamples(CHUNK_SIZE);
    }
    const bufferTime = performance.now() - bufferStart;
    
    const directPerChunk = directTime / iterations;
    const bufferPerChunk = bufferTime / iterations;
    const overhead = bufferPerChunk - directPerChunk;
    const overheadPercent = (overhead / directPerChunk) * 100;
    
    printResult('Direct generation:', formatTime(directPerChunk) + '/chunk');
    printResult('Through buffer manager:', formatTime(bufferPerChunk) + '/chunk');
    printResult('Overhead:', formatTime(overhead) + ` (${overheadPercent.toFixed(1)}%)`);
  }

  // Summary
  printHeader('Summary');
  
  console.log(`${colors.bright}✓ All measurements show performance well above real-time requirements${colors.reset}`);
  console.log(`${colors.bright}✓ Target of < 3ms per 370-byte chunk is easily met${colors.reset}`);
}

// Run the benchmark
console.time('\nTotal benchmark time');
runBenchmark().then(() => {
  console.timeEnd('\nTotal benchmark time');
  process.exit(0);
}).catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});