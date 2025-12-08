// Job Types and Interfaces

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  priority?: number;
}

export interface ImageProcessingJobData {
  imageUrl: string;
  operations: string[];
  userId: string;
}

export interface DataProcessingJobData {
  dataId: string;
  operation: 'transform' | 'validate' | 'aggregate';
  parameters: Record<string, any>;
}

export interface NotificationJobData {
  userId: string;
  message: string;
  type: 'push' | 'sms' | 'email';
}

export interface ScheduledReportJobData {
  reportType: string;
  userId: string;
  format: 'pdf' | 'csv' | 'xlsx';
}

export interface JobResponse {
  jobId: string;
  queueName: string;
  status: string;
  message: string;
  data?: any;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export type QueueName = 
  | 'email-queue'
  | 'image-processing-queue'
  | 'data-processing-queue'
  | 'notification-queue'
  | 'priority-queue'
  | 'scheduled-queue'
  | 'fifo-queue'
  | 'lifo-queue'
  | 'delayed-queue'
  | 'bulk-queue'
  | 'rate-limited-queue'
  | 'deduplication-queue';