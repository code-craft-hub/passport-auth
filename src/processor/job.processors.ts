import { Job } from 'bullmq';
import {
  EmailJobData,
  ImageProcessingJobData,
  DataProcessingJobData,
  NotificationJobData,
  ScheduledReportJobData,
} from '../types';

// Simulated delay for demonstration
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Email Processor
export async function processEmailJob(job: Job<EmailJobData>) {
  console.log(`📧 Processing email job ${job.id} to ${job.data.to}`);
  
  // Update progress
  await job.updateProgress(10);
  
  // Simulate email sending
  await delay(1000);
  await job.updateProgress(50);
  
  // Simulate SMTP connection
  await delay(1000);
  await job.updateProgress(100);
  
  console.log(`✅ Email sent successfully to ${job.data.to}`);
  
  return {
    success: true,
    sentAt: new Date().toISOString(),
    recipient: job.data.to,
  };
}

// Image Processing Processor
export async function processImageJob(job: Job<ImageProcessingJobData>) {
  console.log(`🖼️  Processing image job ${job.id} for ${job.data.imageUrl}`);
  
  await job.updateProgress(20);
  
  // Simulate downloading image
  await delay(1500);
  await job.updateProgress(50);
  
  // Simulate processing operations
  for (const operation of job.data.operations) {
    console.log(`  Applying operation: ${operation}`);
    await delay(500);
  }
  
  await job.updateProgress(100);
  
  console.log(`✅ Image processed successfully`);
  
  return {
    success: true,
    processedUrl: `${job.data.imageUrl}-processed`,
    operations: job.data.operations,
    processedAt: new Date().toISOString(),
  };
}

// Data Processing Processor
export async function processDataJob(job: Job<DataProcessingJobData>) {
  console.log(`📊 Processing data job ${job.id} - ${job.data.operation}`);
  
  await job.updateProgress(25);
  
  // Simulate data loading
  await delay(800);
  await job.updateProgress(50);
  
  // Simulate operation
  await delay(1200);
  await job.updateProgress(75);
  
  // Simulate saving results
  await delay(500);
  await job.updateProgress(100);
  
  console.log(`✅ Data processed successfully`);
  
  return {
    success: true,
    operation: job.data.operation,
    dataId: job.data.dataId,
    processedAt: new Date().toISOString(),
  };
}

// Notification Processor
export async function processNotificationJob(job: Job<NotificationJobData>) {
  console.log(`🔔 Processing notification job ${job.id} - ${job.data.type}`);
  
  await job.updateProgress(30);
  await delay(1000);
  await job.updateProgress(100);
  
  console.log(`✅ Notification sent to user ${job.data.userId}`);
  
  return {
    success: true,
    userId: job.data.userId,
    type: job.data.type,
    sentAt: new Date().toISOString(),
  };
}

// Scheduled Report Processor
export async function processScheduledReportJob(job: Job<ScheduledReportJobData>) {
  console.log(`📈 Processing scheduled report job ${job.id} - ${job.data.reportType}`);
  
  await job.updateProgress(20);
  
  // Simulate data gathering
  await delay(2000);
  await job.updateProgress(60);
  
  // Simulate report generation
  await delay(1500);
  await job.updateProgress(90);
  
  // Simulate saving report
  await delay(500);
  await job.updateProgress(100);
  
  console.log(`✅ Report generated successfully`);
  
  return {
    success: true,
    reportType: job.data.reportType,
    format: job.data.format,
    reportUrl: `/reports/${job.id}.${job.data.format}`,
    generatedAt: new Date().toISOString(),
  };
}

// Generic Processor with Error Simulation
export async function processGenericJob(job: Job) {
  console.log(`⚙️  Processing generic job ${job.id}`);
  
  // Simulate random failures for testing retry mechanism
  if (job.data.simulateError && job.attemptsMade < 2) {
    throw new Error(`Simulated error on attempt ${job.attemptsMade + 1}`);
  }
  
  await delay(1000);
  
  return {
    success: true,
    jobId: job.id,
    processedAt: new Date().toISOString(),
  };
}

// Priority Processor
export async function processPriorityJob(job: Job) {
  console.log(`🎯 Processing priority job ${job.id} with priority ${job.opts.priority || 0}`);
  
  await delay(500);
  
  return {
    success: true,
    priority: job.opts.priority,
    processedAt: new Date().toISOString(),
  };
}

// Bulk Processing Processor
export async function processBulkJob(job: Job) {
  console.log(`📦 Processing bulk job ${job.id}`);
  
  const items = job.data.items || [];
  const results = [];
  
  for (let i = 0; i < items.length; i++) {
    await delay(200);
    results.push({ item: items[i], processed: true });
    await job.updateProgress((i + 1) / items.length * 100);
  }
  
  return {
    success: true,
    totalItems: items.length,
    results,
    processedAt: new Date().toISOString(),
  };
}

// Delayed Job Processor
export async function processDelayedJob(job: Job) {
  console.log(`⏰ Processing delayed job ${job.id} - was delayed until now`);
  
  await delay(1000);
  
  return {
    success: true,
    scheduledFor: job.timestamp,
    processedAt: new Date().toISOString(),
    delay: Date.now() - job.timestamp,
  };
}