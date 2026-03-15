import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
export class ExportService {
    constructor() {
        this.exportsDir = path.join(process.cwd(), 'exports');
        this.ensureExportsDir();
    }
    ensureExportsDir() {
        if (!fs.existsSync(this.exportsDir)) {
            fs.mkdirSync(this.exportsDir, { recursive: true });
        }
    }
    // Generate PDF dossier
    async generatePDFDossier(data, options = { format: 'pdf' }) {
        const filename = `dossier-${uuidv4()}.pdf`;
        const filepath = path.join(this.exportsDir, filename);
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);
        // Classification header
        const classification = options.classification || 'CONFIDENTIAL';
        doc.fontSize(10)
            .fillColor('red')
            .text(classification, { align: 'center' })
            .moveDown(0.5);
        // Title
        doc.fontSize(24)
            .fillColor('black')
            .text('INTELLIGENCE DOSSIER', { align: 'center' })
            .moveDown(0.5);
        // Target
        doc.fontSize(18)
            .text(`Target: ${data.target}`, { align: 'center' })
            .moveDown(1);
        // Metadata
        if (options.includeMetadata !== false) {
            doc.fontSize(10)
                .fillColor('gray')
                .text(`Generated: ${new Date().toISOString()}`, { align: 'right' })
                .text(`Classification: ${classification}`, { align: 'right' })
                .moveDown(1);
        }
        // Identity Confidence
        if (data.identityConfidence) {
            doc.fontSize(14).fillColor('black').text('IDENTITY CONFIDENCE', { underline: true }).moveDown(0.5);
            doc.fontSize(12)
                .text(`Overall Score: ${data.identityConfidence.overallScore}/100`)
                .text(`Name Match: ${data.identityConfidence.nameMatch}%`)
                .text(`Sources: ${data.identityConfidence.sources}`)
                .moveDown(1);
        }
        // Main Report
        doc.fontSize(14).text('INTELLIGENCE REPORT', { underline: true }).moveDown(0.5);
        doc.fontSize(11).text(data.report, { align: 'justify' }).moveDown(1);
        // Social Profiles
        if (data.socialProfiles && data.socialProfiles.length > 0) {
            doc.addPage();
            doc.fontSize(14).text('SOCIAL FOOTPRINT', { underline: true }).moveDown(0.5);
            data.socialProfiles.forEach((profile, index) => {
                doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${profile.platform}`);
                doc.fontSize(11).font('Helvetica')
                    .text(`   Username: ${profile.username}`)
                    .text(`   URL: ${profile.url}`)
                    .text(`   Status: ${profile.status}`)
                    .moveDown(0.5);
            });
        }
        // Sources
        if (data.sources && data.sources.length > 0) {
            doc.addPage();
            doc.fontSize(14).text('SOURCES', { underline: true }).moveDown(0.5);
            data.sources.forEach((source, index) => {
                doc.fontSize(11)
                    .text(`${index + 1}. ${source.title}`)
                    .fillColor('blue').text(`   ${source.uri}`).fillColor('black')
                    .moveDown(0.3);
            });
        }
        // Device Intel
        if (data.deviceIntel) {
            doc.addPage();
            doc.fontSize(14).text('DEVICE INTELLIGENCE', { underline: true }).moveDown(0.5);
            const device = data.deviceIntel;
            doc.fontSize(11)
                .text(`Device: ${device.deviceName}`)
                .text(`OS: ${device.osVersion}`)
                .text(`IP: ${device.ipAddress}`)
                .text(`Location: ${device.lastLocation}`)
                .text(`Status: ${device.status}`)
                .text(`Provider: ${device.provider}`);
        }
        // Compliance
        if (data.compliance) {
            doc.addPage();
            doc.fontSize(14).text('COMPLIANCE METADATA', { underline: true }).moveDown(0.5);
            const comp = data.compliance;
            doc.fontSize(11)
                .text(`GDPR Status: ${comp.gdprStatus}`)
                .text(`CCPA Status: ${comp.ccpaStatus}`)
                .text(`Legal Basis: ${comp.legalBasis}`)
                .text(`Data Retention: ${comp.dataRetentionDate}`)
                .text(`Anonymization: ${comp.anonymizationLevel}`);
        }
        // Verification Notes
        if (data.verificationNotes) {
            doc.addPage();
            doc.fontSize(14).text('VERIFICATION NOTES', { underline: true }).moveDown(0.5);
            doc.fontSize(11).text(data.verificationNotes);
        }
        // Classification footer
        doc.fontSize(10)
            .fillColor('red')
            .text(classification, 50, doc.page.height - 50, { align: 'center' });
        doc.end();
        return new Promise((resolve, reject) => {
            stream.on('finish', () => resolve(filepath));
            stream.on('error', reject);
        });
    }
    // Generate JSON export
    async generateJSON(data, options = { format: 'json' }) {
        const filename = `export-${uuidv4()}.json`;
        const filepath = path.join(this.exportsDir, filename);
        const exportData = {
            metadata: {
                generatedAt: new Date().toISOString(),
                classification: options.classification || 'CONFIDENTIAL',
                version: '1.0',
                exporter: 'Agent7 Intelligence Interface'
            },
            data
        };
        fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
        return filepath;
    }
    // Generate CSV from array data
    async generateCSV(data, headers, options = { format: 'csv' }) {
        const filename = `export-${uuidv4()}.csv`;
        const filepath = path.join(this.exportsDir, filename);
        // Create CSV content
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                // Escape values containing commas or quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value ?? '';
            }).join(',');
        });
        const csvContent = [csvHeaders, ...csvRows].join('\n');
        fs.writeFileSync(filepath, csvContent);
        return filepath;
    }
    // Generate mission PDF
    async generatePDFMission(data, options = { format: 'pdf' }) {
        const filename = `mission-${uuidv4()}.pdf`;
        const filepath = path.join(this.exportsDir, filename);
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);
        const classification = options.classification || 'TOP SECRET';
        // Header
        doc.fontSize(10).fillColor('red').text(classification, { align: 'center' }).moveDown(0.5);
        doc.fontSize(24).fillColor('black').text('MISSION OPERATIONS ORDER', { align: 'center' }).moveDown(1);
        // Target and Objective
        doc.fontSize(14).text('TARGET', { underline: true }).moveDown(0.3);
        doc.fontSize(12).text(data.targetName).moveDown(1);
        doc.fontSize(14).text('OBJECTIVE', { underline: true }).moveDown(0.3);
        doc.fontSize(12).text(data.objective).moveDown(1);
        // Risk and Feasibility
        doc.fontSize(14).text('ASSESSMENT', { underline: true }).moveDown(0.3);
        doc.fontSize(12)
            .text(`Risk Level: ${data.riskLevel}`)
            .text(`Feasibility: ${data.feasibility}%`)
            .moveDown(1);
        // Approach
        doc.fontSize(14).text('APPROACH', { underline: true }).moveDown(0.3);
        doc.fontSize(12).text(data.approach).moveDown(1);
        // Steps
        doc.fontSize(14).text('OPERATIONAL STEPS', { underline: true }).moveDown(0.5);
        data.steps.forEach((step, index) => {
            doc.fontSize(11).text(`${index + 1}. ${step}`).moveDown(0.3);
        });
        doc.moveDown(0.5);
        // Resources
        doc.fontSize(14).text('RESOURCES REQUIRED', { underline: true }).moveDown(0.5);
        data.resources.forEach((resource, index) => {
            doc.fontSize(11).text(`• ${resource}`).moveDown(0.2);
        });
        // Footer
        doc.fontSize(10).fillColor('red').text(classification, 50, doc.page.height - 50, { align: 'center' });
        doc.end();
        return new Promise((resolve, reject) => {
            stream.on('finish', () => resolve(filepath));
            stream.on('error', reject);
        });
    }
    // Get export file info
    getExportInfo(filepath) {
        if (!fs.existsSync(filepath))
            return null;
        const stats = fs.statSync(filepath);
        return {
            filename: path.basename(filepath),
            size: stats.size,
            created: stats.birthtime
        };
    }
    // Clean up old exports
    cleanupOldExports(maxAgeHours = 24) {
        const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
        let deleted = 0;
        if (fs.existsSync(this.exportsDir)) {
            const files = fs.readdirSync(this.exportsDir);
            for (const file of files) {
                const filepath = path.join(this.exportsDir, file);
                const stats = fs.statSync(filepath);
                if (stats.mtimeMs < cutoff) {
                    fs.unlinkSync(filepath);
                    deleted++;
                }
            }
        }
        return deleted;
    }
    // List all exports
    listExports() {
        if (!fs.existsSync(this.exportsDir))
            return [];
        return fs.readdirSync(this.exportsDir)
            .map(file => {
            const filepath = path.join(this.exportsDir, file);
            const stats = fs.statSync(filepath);
            return {
                filename: file,
                size: stats.size,
                created: stats.birthtime,
                path: filepath
            };
        })
            .sort((a, b) => b.created.getTime() - a.created.getTime());
    }
}
// Singleton instance
export const exportService = new ExportService();
