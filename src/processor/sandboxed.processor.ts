/**
 * Sandboxed Processor
 * This file runs in a separate Node.js process (sandbox)
 * Used for CPU-intensive or potentially unstable tasks
 */

export default async function (job: any) {
  console.log(`🔒 Sandboxed processor handling job ${job.id}`);
  
  // Simulate intensive computation
  const start = Date.now();
  let result = 0;
  
  // CPU-intensive task
  for (let i = 0; i < 1000000; i++) {
    result += Math.sqrt(i);
  }
  
  const duration = Date.now() - start;
  
  console.log(`✅ Sandboxed job ${job.id} completed in ${duration}ms`);
  
  return {
    success: true,
    result,
    duration,
    processedAt: new Date().toISOString(),
    sandboxed: true,
  };
}