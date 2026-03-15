import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
class JobQueue extends EventEmitter {
    constructor(maxConcurrent = 3) {
        super();
        this.jobs = new Map();
        this.queue = [];
        this.running = false;
        this.maxConcurrent = 3;
        this.activeJobs = 0;
        this.maxConcurrent = maxConcurrent;
    }
    // Add a job to the queue
    addJob(type, data) {
        const id = uuidv4();
        const job = {
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
    getJob(id) {
        return this.jobs.get(id);
    }
    // Get all jobs
    getAllJobs() {
        return Array.from(this.jobs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    // Get pending/running jobs
    getActiveJobs() {
        return this.getAllJobs().filter(j => j.status === 'pending' || j.status === 'running');
    }
    // Update job progress
    updateProgress(id, progress) {
        const job = this.jobs.get(id);
        if (job) {
            job.progress = Math.min(100, Math.max(0, progress));
            this.emit('job:progress', job);
        }
    }
    // Complete a job
    completeJob(id, result) {
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
    failJob(id, error) {
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
    async processQueue() {
        if (this.running || this.activeJobs >= this.maxConcurrent) {
            return;
        }
        this.running = true;
        while (this.queue.length > 0 && this.activeJobs < this.maxConcurrent) {
            const jobId = this.queue.shift();
            if (!jobId)
                continue;
            const job = this.jobs.get(jobId);
            if (!job)
                continue;
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
    async executeJob(job) {
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
        }
        catch (error) {
            this.failJob(job.id, error.message);
        }
    }
    // Example: Execute dossier generation job
    async executeDossierJob(job) {
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
        }
        catch (error) {
            this.failJob(job.id, error.message);
        }
    }
    // Example: Execute security scan job
    async executeScanJob(job) {
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
        }
        catch (error) {
            this.failJob(job.id, error.message);
        }
    }
    // Utility: Delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Cancel a job
    cancelJob(id) {
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
    clearOldJobs(hours = 24) {
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
