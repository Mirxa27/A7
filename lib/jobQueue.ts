import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

interface Job {
  id: string;
  type: string;
  data: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

class JobQueue extends EventEmitter {
  private jobs: Map<string, Job> = new Map();
  private queue: string[] = [];
  private running: boolean = false;
  private maxConcurrent: number = 3;
  private activeJobs: number = 0;

  constructor(maxConcurrent: number = 3) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  // Add a job to the queue
  addJob(type: string, data: any): string {
    const id = uuidv4();
    const job: Job = {
      id,
      type,
      data,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    this.jobs.set(id, job);
    this.queue.push(id);
    this.emit('job:added', job);
    
    // Start processing if not already running
    this.processQueue();
    
    return id;
  }

  // Get job status
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  // Get all jobs
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // Get pending/running jobs
  getActiveJobs(): Job[] {
    return this.getAllJobs().filter(j => j.status === 'pending' || j.status === 'running');
  }

  // Update job progress
  updateProgress(id: string, progress: number): void {
    const job = this.jobs.get(id);
    if (job) {
      job.progress = Math.min(100, Math.max(0, progress));
      this.emit('job:progress', job);
    }
  }

  // Complete a job
  completeJob(id: string, result: any): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'completed';
      job.result = result;
      job.progress = 100;
      job.completedAt = new Date();
      this.activeJobs--;
      this.emit('job:completed', job);
      this.processQueue();
    }
  }

  // Fail a job
  failJob(id: string, error: string): void {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.completedAt = new Date();
      this.activeJobs--;
      this.emit('job:failed', job);
      this.processQueue();
    }
  }

  // Process the queue
  private async processQueue(): Promise<void> {
    if (this.running || this.activeJobs >= this.maxConcurrent) {
      return;
    }

    this.running = true;

    while (this.queue.length > 0 && this.activeJobs < this.maxConcurrent) {
      const jobId = this.queue.shift();
      if (!jobId) continue;

      const job = this.jobs.get(jobId);
      if (!job) continue;

      job.status = 'running';
      job.startedAt = new Date();
      this.activeJobs++;
      this.emit('job:started', job);

      // Process job asynchronously
      this.executeJob(job);
    }

    this.running = false;
  }

  // Execute a job (to be overridden or extended)
  private async executeJob(job: Job): Promise<void> {
    try {
      switch (job.type) {
        case 'dossier':
          await this.executeDossierJob(job);
          break;
        case 'scan':
          await this.executeScanJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
    } catch (error: any) {
      this.failJob(job.id, error.message);
    }
  }

  // Example: Execute dossier generation job
  private async executeDossierJob(job: Job): Promise<void> {
    const { target, resources } = job.data;
    
    try {
      // Simulate progressive updates
      this.updateProgress(job.id, 10);
      await this.delay(1000);
      
      this.updateProgress(job.id, 30);
      await this.delay(1000);
      
      this.updateProgress(job.id, 60);
      await this.delay(1000);
      
      this.updateProgress(job.id, 90);
      
      // Mock result - in real implementation, call actual services
      const result = {
        target,
        resources,
        timestamp: new Date().toISOString(),
        status: 'completed',
        message: 'Dossier generation completed'
      };
      
      this.completeJob(job.id, result);
    } catch (error: any) {
      this.failJob(job.id, error.message);
    }
  }

  // Example: Execute security scan job
  private async executeScanJob(job: Job): Promise<void> {
    const { target, scanType } = job.data;
    
    try {
      this.updateProgress(job.id, 20);
      await this.delay(500);
      
      this.updateProgress(job.id, 50);
      await this.delay(500);
      
      this.updateProgress(job.id, 80);
      
      const result = {
        target,
        scanType,
        timestamp: new Date().toISOString(),
        findings: [],
        status: 'completed'
      };
      
      this.completeJob(job.id, result);
    } catch (error: any) {
      this.failJob(job.id, error.message);
    }
  }

  // Utility: Delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cancel a job
  cancelJob(id: string): boolean {
    const index = this.queue.indexOf(id);
    if (index > -1) {
      this.queue.splice(index, 1);
      const job = this.jobs.get(id);
      if (job) {
        job.status = 'failed';
        job.error = 'Cancelled by user';
        this.emit('job:cancelled', job);
      }
      return true;
    }
    return false;
  }

  // Clear completed jobs older than specified hours
  clearOldJobs(hours: number = 24): number {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    let cleared = 0;
    
    for (const [id, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.completedAt && job.completedAt < cutoff) {
        this.jobs.delete(id);
        cleared++;
      }
    }
    
    return cleared;
  }
}

// Singleton instance
export const jobQueue = new JobQueue();

// Export types
export type { Job };
