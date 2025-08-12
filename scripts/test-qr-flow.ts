#!/usr/bin/env tsx

/**
 * @fileoverview E2E Test Script for Complete QR Tagging Workflow
 * 
 * This script simulates the complete QR tagging workflow:
 * 1. Creates test event with students
 * 2. Generates QR codes for each student
 * 3. Uploads test photos
 * 4. Simulates QR scanning and photo tagging
 * 5. Verifies database state and data consistency
 * 
 * Usage:
 *   npm run test:qr-flow
 *   tsx scripts/test-qr-flow.ts [--cleanup] [--verbose] [--students=N] [--photos=N]
 */

import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Test configuration
interface TestConfig {
  cleanup: boolean;
  verbose: boolean;
  studentCount: number;
  photoCount: number;
  testEventName: string;
}

// Test results tracking
interface TestResults {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  errors: string[];
  details: {
    eventCreated: boolean;
    studentsCreated: number;
    photosUploaded: number;
    qrCodesGenerated: number;
    taggingOperations: number;
    verificationPassed: boolean;
  };
}

// Test data structures
interface TestStudent {
  id: string;
  name: string;
  grade: string;
  token: string;
  qrCode: string;
}

interface TestPhoto {
  id: string;
  filename: string;
  storage_path: string;
}

class QRWorkflowTester {
  private supabase: any;
  private config: TestConfig;
  private results: TestResults;
  private testEventId: string | null = null;
  private testStudents: TestStudent[] = [];
  private testPhotos: TestPhoto[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.results = {
      success: false,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      duration: 0,
      errors: [],
      details: {
        eventCreated: false,
        studentsCreated: 0,
        photosUploaded: 0,
        qrCodesGenerated: 0,
        taggingOperations: 0,
        verificationPassed: false,
      },
    };
  }

  async run(): Promise<TestResults> {
    const startTime = Date.now();

    try {
      this.log('🚀 Starting QR Workflow E2E Test Suite');
      this.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);

      // Initialize Supabase client
      this.supabase = await createServerSupabaseServiceClient();

      // Run test sequence
      await this.setupTestEvent();
      await this.createTestStudents();
      await this.generateQRCodes();
      await this.uploadTestPhotos();
      await this.simulateQRTaggingWorkflow();
      await this.verifyDatabaseState();

      if (this.config.cleanup) {
        await this.cleanup();
      }

      this.results.success = this.results.errors.length === 0;
      this.results.duration = Date.now() - startTime;

      this.log('✅ QR Workflow E2E Test Suite Completed');
      this.printResults();

    } catch (error) {
      this.results.errors.push(`Test suite failed: ${error instanceof Error ? error.message : String(error)}`);
      this.results.duration = Date.now() - startTime;
      
      this.log('❌ QR Workflow E2E Test Suite Failed');
      this.printResults();

      if (this.config.cleanup && this.testEventId) {
        await this.cleanup();
      }
    }

    return this.results;
  }

  private async setupTestEvent(): Promise<void> {
    this.log('📅 Setting up test event...');
    this.results.totalTests++;

    try {
      const { data: event, error } = await this.supabase
        .from('events')
        .insert({
          name: this.config.testEventName,
          school_name: 'E2E Test School',
          event_date: new Date().toISOString().split('T')[0],
          active: true,
          created_by: 'e2e-test-suite',
        })
        .select()
        .single();

      if (error) throw error;

      this.testEventId = event.id;
      this.results.details.eventCreated = true;
      this.results.passedTests++;

      this.log(`✅ Test event created: ${event.name} (ID: ${event.id})`);
    } catch (error) {
      this.results.failedTests++;
      this.results.errors.push(`Failed to create test event: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async createTestStudents(): Promise<void> {
    this.log(`👥 Creating ${this.config.studentCount} test students...`);
    this.results.totalTests++;

    try {
      const studentNames = [
        'Juan Carlos Pérez García',
        'María Esperanza López Martínez',
        'Ana Sofía González Rodríguez',
        'Carlos Eduardo Ramírez Silva',
        'Lucía Fernanda Torres Morales',
        'Diego Alejandro Cruz Herrera',
        'Valentina Isabel Ruiz Castro',
        'Sebastián David Vargas Mendoza',
        'Isabella Camila Jiménez Flores',
        'Mateo Nicolás Guerrero Vásquez',
      ];

      const studentsToCreate = [];
      for (let i = 0; i < this.config.studentCount; i++) {
        const name = studentNames[i % studentNames.length] || `Test Student ${i + 1}`;
        const grade = `${Math.floor(i / 5) + 1}${String.fromCharCode(65 + (i % 5))}`;
        const token = this.generateSecureToken(24);

        studentsToCreate.push({
          event_id: this.testEventId,
          name,
          grade,
          token,
          token_expires_at: this.getFutureDate(30),
        });
      }

      const { data: students, error } = await this.supabase
        .from('subjects')
        .insert(studentsToCreate)
        .select();

      if (error) throw error;

      this.testStudents = students.map((student: any) => ({
        id: student.id,
        name: student.name,
        grade: student.grade,
        token: student.token,
        qrCode: '', // Will be generated next
      }));

      this.results.details.studentsCreated = students.length;
      this.results.passedTests++;

      this.log(`✅ Created ${students.length} test students`);
    } catch (error) {
      this.results.failedTests++;
      this.results.errors.push(`Failed to create test students: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async generateQRCodes(): Promise<void> {
    this.log('🔲 Generating QR codes for students...');
    this.results.totalTests++;

    try {
      for (const student of this.testStudents) {
        // Generate QR in expected format: STUDENT:ID:NAME:EVENT_ID
        student.qrCode = `STUDENT:${student.id}:${student.name}:${this.testEventId}`;
      }

      this.results.details.qrCodesGenerated = this.testStudents.length;
      this.results.passedTests++;

      this.log(`✅ Generated ${this.testStudents.length} QR codes`);

      if (this.config.verbose) {
        this.testStudents.slice(0, 3).forEach((student, index) => {
          this.log(`  QR ${index + 1}: ${student.qrCode.substring(0, 50)}...`);
        });
      }
    } catch (error) {
      this.results.failedTests++;
      this.results.errors.push(`Failed to generate QR codes: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async uploadTestPhotos(): Promise<void> {
    this.log(`📸 Creating ${this.config.photoCount} test photos...`);
    this.results.totalTests++;

    try {
      const photosToCreate = [];
      for (let i = 0; i < this.config.photoCount; i++) {
        const filename = `e2e-test-photo-${i + 1}.jpg`;
        const storage_path = `events/${this.testEventId}/${filename}`;

        photosToCreate.push({
          event_id: this.testEventId,
          filename,
          storage_path,
          approved: true,
          watermark_applied: true,
          file_size: 1024 * (100 + i * 10), // Vary file sizes
          width: 1920,
          height: 1080,
          mime_type: 'image/jpeg',
        });
      }

      const { data: photos, error } = await this.supabase
        .from('photos')
        .insert(photosToCreate)
        .select();

      if (error) throw error;

      this.testPhotos = photos.map((photo: any) => ({
        id: photo.id,
        filename: photo.filename,
        storage_path: photo.storage_path,
      }));

      this.results.details.photosUploaded = photos.length;
      this.results.passedTests++;

      this.log(`✅ Created ${photos.length} test photos`);
    } catch (error) {
      this.results.failedTests++;
      this.results.errors.push(`Failed to create test photos: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async simulateQRTaggingWorkflow(): Promise<void> {
    this.log('🏷️ Simulating QR tagging workflow...');
    this.results.totalTests += this.testStudents.length;

    let successfulOperations = 0;

    for (const student of this.testStudents) {
      try {
        // Step 1: Simulate QR decode
        await this.simulateQRDecode(student);

        // Step 2: Assign random photos to student
        const photosToAssign = this.getRandomPhotos(Math.floor(Math.random() * 5) + 1);
        await this.simulateBatchTagging(student, photosToAssign);

        successfulOperations++;
        this.results.passedTests++;

        this.log(`✅ Tagged ${photosToAssign.length} photos for ${student.name}`);

        if (this.config.verbose) {
          this.log(`  Student: ${student.name}`);
          this.log(`  Photos: ${photosToAssign.map(p => p.filename).join(', ')}`);
        }

      } catch (error) {
        this.results.failedTests++;
        this.results.errors.push(`Tagging failed for ${student.name}: ${error instanceof Error ? error.message : String(error)}`);
        
        if (this.config.verbose) {
          this.log(`❌ Tagging failed for ${student.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    this.results.details.taggingOperations = successfulOperations;

    this.log(`📊 Tagging Summary: ${successfulOperations}/${this.testStudents.length} students tagged successfully`);
  }

  private async simulateQRDecode(student: TestStudent): Promise<any> {
    // Simulate the QR decode API call
    const response = await fetch('/api/admin/qr/decode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode: student.qrCode }),
    });

    if (!response.ok) {
      throw new Error(`QR decode failed for ${student.name}: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`QR decode returned error: ${data.error}`);
    }

    return data.student;
  }

  private async simulateBatchTagging(student: TestStudent, photos: TestPhoto[]): Promise<void> {
    // Simulate the batch tagging API call
    const response = await fetch('/api/admin/tagging/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: this.testEventId,
        photoIds: photos.map(p => p.id),
        studentId: student.id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Batch tagging failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`Batch tagging returned error: ${data.error}`);
    }
  }

  private async verifyDatabaseState(): Promise<void> {
    this.log('🔍 Verifying database state...');
    this.results.totalTests++;

    try {
      // Verify photo_subjects assignments
      const { data: assignments, error: assignmentsError } = await this.supabase
        .from('photo_subjects')
        .select(`
          photo_id,
          subject_id,
          photos (id, filename, event_id),
          subjects (id, name, event_id)
        `)
        .in('subject_id', this.testStudents.map(s => s.id));

      if (assignmentsError) throw assignmentsError;

      // Verify all assignments belong to correct event
      const invalidAssignments = assignments.filter((assignment: any) => 
        assignment.photos.event_id !== this.testEventId || 
        assignment.subjects.event_id !== this.testEventId
      );

      if (invalidAssignments.length > 0) {
        throw new Error(`Found ${invalidAssignments.length} invalid assignments across events`);
      }

      // Verify referential integrity
      const photoIds = new Set(this.testPhotos.map(p => p.id));
      const studentIds = new Set(this.testStudents.map(s => s.id));

      const invalidPhotoRefs = assignments.filter((assignment: any) => 
        !photoIds.has(assignment.photo_id)
      );

      const invalidStudentRefs = assignments.filter((assignment: any) => 
        !studentIds.has(assignment.subject_id)
      );

      if (invalidPhotoRefs.length > 0) {
        throw new Error(`Found ${invalidPhotoRefs.length} assignments with invalid photo references`);
      }

      if (invalidStudentRefs.length > 0) {
        throw new Error(`Found ${invalidStudentRefs.length} assignments with invalid student references`);
      }

      // Verify no duplicate assignments
      const assignmentKeys = assignments.map((assignment: any) => 
        `${assignment.photo_id}:${assignment.subject_id}`
      );
      const uniqueKeys = new Set(assignmentKeys);

      if (assignmentKeys.length !== uniqueKeys.size) {
        throw new Error(`Found duplicate assignments: ${assignmentKeys.length - uniqueKeys.size} duplicates`);
      }

      this.results.details.verificationPassed = true;
      this.results.passedTests++;

      this.log(`✅ Database verification passed:`);
      this.log(`  - Total assignments: ${assignments.length}`);
      this.log(`  - All assignments valid: ✅`);
      this.log(`  - Referential integrity: ✅`);
      this.log(`  - No duplicates: ✅`);

      // Additional statistics
      const assignmentsByStudent = assignments.reduce((acc: any, assignment: any) => {
        acc[assignment.subject_id] = (acc[assignment.subject_id] || 0) + 1;
        return acc;
      }, {});

      const avgPhotosPerStudent = assignments.length / this.testStudents.length;
      const minPhotos = Math.min(...Object.values(assignmentsByStudent));
      const maxPhotos = Math.max(...Object.values(assignmentsByStudent));

      this.log(`📈 Assignment Statistics:`);
      this.log(`  - Average photos per student: ${avgPhotosPerStudent.toFixed(2)}`);
      this.log(`  - Min photos assigned: ${minPhotos}`);
      this.log(`  - Max photos assigned: ${maxPhotos}`);

    } catch (error) {
      this.results.failedTests++;
      this.results.errors.push(`Database verification failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    this.log('🧹 Cleaning up test data...');

    try {
      if (this.testEventId) {
        // Delete photo_subjects first (foreign key constraints)
        await this.supabase
          .from('photo_subjects')
          .delete()
          .in('subject_id', this.testStudents.map(s => s.id));

        // Delete photos
        await this.supabase
          .from('photos')
          .delete()
          .eq('event_id', this.testEventId);

        // Delete subjects
        await this.supabase
          .from('subjects')
          .delete()
          .eq('event_id', this.testEventId);

        // Delete event
        await this.supabase
          .from('events')
          .delete()
          .eq('id', this.testEventId);

        this.log('✅ Test data cleaned up successfully');
      }
    } catch (error) {
      this.log(`⚠️ Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw cleanup errors
    }
  }

  private getRandomPhotos(count: number): TestPhoto[] {
    const shuffled = [...this.testPhotos].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, this.testPhotos.length));
  }

  private generateSecureToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return result;
  }

  private getFutureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    
    logger.info('QR E2E Test', {
      message,
      testEvent: this.testEventId,
      timestamp,
    });
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 QR WORKFLOW E2E TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Status: ${this.results.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Duration: ${(this.results.duration / 1000).toFixed(2)}s`);
    console.log(`Tests: ${this.results.passedTests}/${this.results.totalTests} passed`);
    
    console.log('\n📋 Test Details:');
    console.log(`  Event Created: ${this.results.details.eventCreated ? '✅' : '❌'}`);
    console.log(`  Students Created: ${this.results.details.studentsCreated}`);
    console.log(`  QR Codes Generated: ${this.results.details.qrCodesGenerated}`);
    console.log(`  Photos Uploaded: ${this.results.details.photosUploaded}`);
    console.log(`  Tagging Operations: ${this.results.details.taggingOperations}`);
    console.log(`  Verification Passed: ${this.results.details.verificationPassed ? '✅' : '❌'}`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log('='.repeat(80) + '\n');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const config: TestConfig = {
    cleanup: args.includes('--cleanup'),
    verbose: args.includes('--verbose'),
    studentCount: parseInt(args.find(arg => arg.startsWith('--students='))?.split('=')[1] || '10'),
    photoCount: parseInt(args.find(arg => arg.startsWith('--photos='))?.split('=')[1] || '20'),
    testEventName: `E2E Test Event ${new Date().toISOString().substring(0, 16)}`,
  };

  const tester = new QRWorkflowTester(config);
  const results = await tester.run();

  // Write results to file for CI/CD
  const resultsPath = path.join(process.cwd(), 'test-reports', 'qr-workflow-e2e.json');
  await fs.mkdir(path.dirname(resultsPath), { recursive: true });
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));

  process.exit(results.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

export { QRWorkflowTester, type TestConfig, type TestResults };