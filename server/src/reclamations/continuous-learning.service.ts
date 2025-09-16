import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AICoreService } from './ai-core.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface LearningMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

interface ModelPerformance {
  modelType: string;
  metrics: LearningMetrics;
  lastUpdated: Date;
  trainingDataSize: number;
}

@Injectable()
export class ContinuousLearningService {
  private readonly logger = new Logger(ContinuousLearningService.name);
  private modelPerformance: Map<string, ModelPerformance> = new Map();

  constructor(
    private prisma: PrismaService,
    private aiCore: AICoreService
  ) {}

  // Continuous learning - runs daily
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async performContinuousLearning(): Promise<void> {
    try {
      this.logger.log('Starting continuous learning process...');
      
      // Collect new feedback data
      const newFeedback = await this.collectNewFeedbackData();
      
      if (newFeedback.length === 0) {
        this.logger.log('No new feedback data available for learning');
        return;
      }
      
      // Update models with new data
      await this.updateModelsWithNewData(newFeedback);
      
      // Evaluate model performance
      const performance = await this.evaluateModelPerformance();
      
      // Store performance metrics
      await this.storePerformanceMetrics(performance);
      
      // Trigger model retraining if performance drops
      if (performance.accuracy < 0.8) {
        await this.triggerModelRetraining();
      }
      
      this.logger.log(`Continuous learning completed. New accuracy: ${performance.accuracy}`);
      
    } catch (error) {
      this.logger.error('Continuous learning failed:', error);
    }
  }

  // Collect feedback from recent classifications
  private async collectNewFeedbackData(): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Last 7 days
    
    // Get recent reclamations with manual corrections
    const recentReclamations = await this.prisma.reclamation.findMany({
      where: {
        updatedAt: { gte: cutoffDate },
        // Look for reclamations that were manually updated (indicating corrections)
        history: {
          some: {
            action: { in: ['UPDATE', 'RECLASSIFY'] },
            createdAt: { gte: cutoffDate }
          }
        }
      },
      include: {
        history: {
          where: {
            action: { in: ['UPDATE', 'RECLASSIFY'] },
            createdAt: { gte: cutoffDate }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: 100
    });
    
    // Convert to feedback format
    const feedbackData = recentReclamations.map(rec => ({
      text: rec.description,
      originalCategory: rec.type,
      originalPriority: rec.severity,
      actualCategory: rec.type, // Assume current values are correct after manual review
      actualPriority: rec.severity,
      corrected: rec.history.length > 0,
      timestamp: rec.updatedAt
    }));
    
    return feedbackData;
  }

  // Update AI models with new feedback data
  private async updateModelsWithNewData(feedbackData: any[]): Promise<void> {
    try {
      // Prepare training data
      const trainingData = feedbackData.map(f => ({
        text: f.text,
        actualCategory: f.actualCategory,
        actualPriority: f.actualPriority
      }));
      
      // Update AI core models
      await this.aiCore.updateModelsWithFeedback(trainingData);
      
      // Store learning records
      await this.prisma.aILearning.createMany({
        data: feedbackData.map(f => ({
          analysisType: 'CONTINUOUS_LEARNING',
          inputPattern: f.text,
          expectedOutput: `${f.actualCategory}:${f.actualPriority}`,
          actualOutput: `${f.originalCategory}:${f.originalPriority}`,
          accuracy: f.corrected ? 0.0 : 1.0, // 0 if it needed correction, 1 if it was correct
          feedback: f.corrected ? -1 : 1,
          userId: 'CONTINUOUS_LEARNING_SYSTEM'
        }))
      });
      
      this.logger.log(`Updated models with ${trainingData.length} new training examples`);
      
    } catch (error) {
      this.logger.error('Failed to update models with new data:', error);
      throw error;
    }
  }

  // Evaluate current model performance
  private async evaluateModelPerformance(): Promise<LearningMetrics> {
    try {
      // Get recent learning data for evaluation
      const evaluationData = await this.prisma.aILearning.findMany({
        where: {
          analysisType: { in: ['CLASSIFICATION', 'CONTINUOUS_LEARNING'] },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        },
        take: 500,
        orderBy: { createdAt: 'desc' }
      });
      
      if (evaluationData.length === 0) {
        return { accuracy: 0, precision: 0, recall: 0, f1Score: 0 };
      }
      
      // Calculate metrics
      let correctPredictions = 0;
      let totalPredictions = evaluationData.length;
      
      // For precision/recall, we need to track true positives, false positives, etc.
      const categoryMetrics = new Map<string, { tp: number; fp: number; fn: number }>();
      
      for (const data of evaluationData) {
        const isCorrect = data.accuracy > 0.5;
        if (isCorrect) correctPredictions++;
        
        // Extract category from expected and actual outputs
        const expectedCategory = data.expectedOutput.split(':')[0];
        const actualCategory = data.actualOutput.split(':')[0];
        
        if (!categoryMetrics.has(expectedCategory)) {
          categoryMetrics.set(expectedCategory, { tp: 0, fp: 0, fn: 0 });
        }
        if (!categoryMetrics.has(actualCategory)) {
          categoryMetrics.set(actualCategory, { tp: 0, fp: 0, fn: 0 });
        }
        
        if (expectedCategory === actualCategory) {
          categoryMetrics.get(expectedCategory)!.tp++;
        } else {
          categoryMetrics.get(actualCategory)!.fp++;
          categoryMetrics.get(expectedCategory)!.fn++;
        }
      }
      
      const accuracy = correctPredictions / totalPredictions;
      
      // Calculate macro-averaged precision and recall
      let totalPrecision = 0;
      let totalRecall = 0;
      let validCategories = 0;
      
      categoryMetrics.forEach((metrics, category) => {
        const precision = metrics.tp / (metrics.tp + metrics.fp) || 0;
        const recall = metrics.tp / (metrics.tp + metrics.fn) || 0;
        
        if (metrics.tp + metrics.fp > 0 || metrics.tp + metrics.fn > 0) {
          totalPrecision += precision;
          totalRecall += recall;
          validCategories++;
        }
      });
      
      const avgPrecision = validCategories > 0 ? totalPrecision / validCategories : 0;
      const avgRecall = validCategories > 0 ? totalRecall / validCategories : 0;
      const f1Score = (avgPrecision + avgRecall) > 0 ? 2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall) : 0;
      
      return {
        accuracy,
        precision: avgPrecision,
        recall: avgRecall,
        f1Score
      };
      
    } catch (error) {
      this.logger.error('Failed to evaluate model performance:', error);
      return { accuracy: 0, precision: 0, recall: 0, f1Score: 0 };
    }
  }

  // Store performance metrics
  private async storePerformanceMetrics(metrics: LearningMetrics): Promise<void> {
    try {
      await this.prisma.performanceAnalysis.create({
        data: {
          userId: 'CONTINUOUS_LEARNING_SYSTEM',
          analysisDate: new Date(),
          recommendations: JSON.stringify({
            accuracy: metrics.accuracy,
            precision: metrics.precision,
            recall: metrics.recall,
            f1Score: metrics.f1Score,
            suggestions: this.generatePerformanceRecommendations(metrics)
          }),
          confidence: metrics.accuracy,
          aiGenerated: true
        }
      });
      
      // Update in-memory performance tracking
      this.modelPerformance.set('classification', {
        modelType: 'classification',
        metrics,
        lastUpdated: new Date(),
        trainingDataSize: await this.prisma.aILearning.count()
      });
      
    } catch (error) {
      this.logger.error('Failed to store performance metrics:', error);
    }
  }

  // Trigger model retraining when performance drops
  private async triggerModelRetraining(): Promise<void> {
    try {
      this.logger.warn('Model performance below threshold, triggering retraining...');
      
      // Get all available training data
      const allTrainingData = await this.prisma.aILearning.findMany({
        where: {
          analysisType: { in: ['CLASSIFICATION', 'CONTINUOUS_LEARNING'] }
        },
        take: 2000,
        orderBy: { createdAt: 'desc' }
      });
      
      if (allTrainingData.length < 50) {
        this.logger.warn('Insufficient training data for retraining');
        return;
      }
      
      // Prepare retraining data
      const retrainingData = allTrainingData.map(d => ({
        text: d.inputPattern,
        actualCategory: d.expectedOutput.split(':')[0],
        actualPriority: d.expectedOutput.split(':')[1] || 'medium'
      }));
      
      // Retrain models
      await this.aiCore.updateModelsWithFeedback(retrainingData);
      
      // Log retraining event
      await this.prisma.auditLog.create({
        data: {
          userId: 'CONTINUOUS_LEARNING_SYSTEM',
          action: 'MODEL_RETRAINED',
          details: {
            reason: 'Performance below threshold',
            trainingDataSize: retrainingData.length,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      this.logger.log(`Model retraining completed with ${retrainingData.length} examples`);
      
    } catch (error) {
      this.logger.error('Model retraining failed:', error);
    }
  }

  // Generate recommendations based on performance metrics
  private generatePerformanceRecommendations(metrics: LearningMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.accuracy < 0.8) {
      recommendations.push('Accuracy below 80% - Consider collecting more training data');
      recommendations.push('Review and improve data quality');
    }
    
    if (metrics.precision < 0.7) {
      recommendations.push('Low precision - Reduce false positives by refining classification rules');
    }
    
    if (metrics.recall < 0.7) {
      recommendations.push('Low recall - Improve feature extraction to catch more true positives');
    }
    
    if (metrics.f1Score < 0.75) {
      recommendations.push('Balance precision and recall for better overall performance');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Model performance is satisfactory - Continue monitoring');
    }
    
    return recommendations;
  }

  // Public API methods
  async getModelPerformance(): Promise<ModelPerformance[]> {
    return Array.from(this.modelPerformance.values());
  }

  async forceLearningUpdate(): Promise<void> {
    await this.performContinuousLearning();
  }

  async getRecentLearningStats(): Promise<any> {
    const recentLearning = await this.prisma.aILearning.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      select: {
        analysisType: true,
        accuracy: true,
        createdAt: true
      }
    });
    
    const stats = {
      totalLearningEvents: recentLearning.length,
      avgAccuracy: recentLearning.length > 0 ? 
        recentLearning.reduce((sum, l) => sum + l.accuracy, 0) / recentLearning.length : 0,
      learningByType: recentLearning.reduce((acc, l) => {
        acc[l.analysisType] = (acc[l.analysisType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    return stats;
  }
}