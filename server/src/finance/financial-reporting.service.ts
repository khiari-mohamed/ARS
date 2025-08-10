import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PaymentAnalytics {
  period: { start: Date; end: Date };
  summary: {
    totalPayments: number;
    totalAmount: number;
    averageAmount: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
    successRate: number;
  };
  trends: PaymentTrend[];
  byStatus: { [status: string]: number };
  byAmount: AmountDistribution[];
  byBeneficiary: BeneficiaryAnalytics[];
  topPayments: PaymentSummary[];
}

export interface PaymentTrend {
  date: string;
  count: number;
  amount: number;
  successRate: number;
  averageAmount: number;
}

export interface AmountDistribution {
  range: string;
  count: number;
  percentage: number;
  totalAmount: number;
}

export interface BeneficiaryAnalytics {
  beneficiaryName: string;
  paymentCount: number;
  totalAmount: number;
  averageAmount: number;
  lastPaymentDate: Date;
}

export interface PaymentSummary {
  id: string;
  beneficiaryName: string;
  amount: number;
  date: Date;
  status: string;
  reference: string;
}

export interface CashFlowProjection {
  period: { start: Date; end: Date };
  projectionType: 'daily' | 'weekly' | 'monthly';
  projections: CashFlowPeriod[];
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    averageDailyOutflow: number;
    projectedBalance: number;
  };
  assumptions: ProjectionAssumption[];
  riskFactors: RiskFactor[];
}

export interface CashFlowPeriod {
  date: string;
  scheduledOutflows: number;
  projectedOutflows: number;
  estimatedInflows: number;
  netFlow: number;
  cumulativeBalance: number;
  confidence: number;
}

export interface ProjectionAssumption {
  category: string;
  description: string;
  value: number;
  impact: 'low' | 'medium' | 'high';
}

export interface RiskFactor {
  factor: string;
  probability: number;
  impact: number;
  description: string;
  mitigation: string;
}

export interface FinancialReport {
  id: string;
  type: 'payment_analytics' | 'cash_flow' | 'reconciliation' | 'compliance' | 'custom';
  title: string;
  period: { start: Date; end: Date };
  data: any;
  generatedAt: Date;
  generatedBy: string;
  format: 'json' | 'pdf' | 'excel' | 'csv';
  status: 'generating' | 'completed' | 'failed';
}

@Injectable()
export class FinancialReportingService {
  private readonly logger = new Logger(FinancialReportingService.name);

  constructor(private prisma: PrismaService) {}

  // === PAYMENT ANALYTICS ===
  async generatePaymentAnalytics(period: { start: Date; end: Date }): Promise<PaymentAnalytics> {
    try {
      // Mock payment data - in production would query actual payments
      const mockPayments = this.generateMockPayments(period);

      const summary = {
        totalPayments: mockPayments.length,
        totalAmount: mockPayments.reduce((sum, p) => sum + p.amount, 0),
        averageAmount: mockPayments.length > 0 ? 
          mockPayments.reduce((sum, p) => sum + p.amount, 0) / mockPayments.length : 0,
        successfulPayments: mockPayments.filter(p => p.status === 'completed').length,
        failedPayments: mockPayments.filter(p => p.status === 'failed').length,
        pendingPayments: mockPayments.filter(p => p.status === 'pending').length,
        successRate: mockPayments.length > 0 ? 
          (mockPayments.filter(p => p.status === 'completed').length / mockPayments.length) * 100 : 0
      };

      const trends = this.calculatePaymentTrends(mockPayments, period);
      const byStatus = this.groupPaymentsByStatus(mockPayments);
      const byAmount = this.calculateAmountDistribution(mockPayments);
      const byBeneficiary = this.calculateBeneficiaryAnalytics(mockPayments);
      const topPayments = this.getTopPayments(mockPayments, 10);

      return {
        period,
        summary,
        trends,
        byStatus,
        byAmount,
        byBeneficiary,
        topPayments
      };
    } catch (error) {
      this.logger.error('Failed to generate payment analytics:', error);
      throw error;
    }
  }

  private generateMockPayments(period: { start: Date; end: Date }): any[] {
    const payments: any[] = [];
    const daysDiff = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    const totalPayments = Math.floor(daysDiff * (Math.random() * 10 + 5)); // 5-15 payments per day

    const beneficiaries = [
      'ACME Corporation', 'Tech Solutions Ltd', 'Global Services Inc', 'Innovation Partners',
      'Digital Systems SA', 'Business Solutions', 'Enterprise Corp', 'Advanced Tech',
      'Professional Services', 'Strategic Partners'
    ];

    const statuses = ['completed', 'pending', 'failed'];
    const statusWeights = [0.85, 0.12, 0.03]; // 85% completed, 12% pending, 3% failed

    for (let i = 0; i < totalPayments; i++) {
      const randomDate = new Date(
        period.start.getTime() + Math.random() * (period.end.getTime() - period.start.getTime())
      );

      const status = this.weightedRandomChoice(statuses, statusWeights);
      const amount = this.generateRandomAmount();

      payments.push({
        id: `pay_${i + 1}`,
        beneficiaryName: beneficiaries[Math.floor(Math.random() * beneficiaries.length)],
        amount,
        date: randomDate,
        status,
        reference: `REF-${randomDate.getFullYear()}-${String(i + 1).padStart(4, '0')}`
      });
    }

    return payments.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private generateRandomAmount(): number {
    // Generate amounts with realistic distribution
    const rand = Math.random();
    if (rand < 0.6) return Math.round((Math.random() * 5000 + 100) * 100) / 100; // 60% small amounts (100-5000)
    if (rand < 0.85) return Math.round((Math.random() * 20000 + 5000) * 100) / 100; // 25% medium amounts (5000-25000)
    return Math.round((Math.random() * 100000 + 25000) * 100) / 100; // 15% large amounts (25000-125000)
  }

  private weightedRandomChoice(choices: string[], weights: number[]): string {
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < choices.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return choices[i];
      }
    }
    
    return choices[choices.length - 1];
  }

  private calculatePaymentTrends(payments: any[], period: { start: Date; end: Date }): PaymentTrend[] {
    const trends: PaymentTrend[] = [];
    const daysDiff = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(period.start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPayments = payments.filter(p => 
        p.date.toISOString().split('T')[0] === dateStr
      );

      const successfulPayments = dayPayments.filter(p => p.status === 'completed');

      trends.push({
        date: dateStr,
        count: dayPayments.length,
        amount: dayPayments.reduce((sum, p) => sum + p.amount, 0),
        successRate: dayPayments.length > 0 ? (successfulPayments.length / dayPayments.length) * 100 : 0,
        averageAmount: dayPayments.length > 0 ? 
          dayPayments.reduce((sum, p) => sum + p.amount, 0) / dayPayments.length : 0
      });
    }

    return trends;
  }

  private groupPaymentsByStatus(payments: any[]): { [status: string]: number } {
    return payments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAmountDistribution(payments: any[]): AmountDistribution[] {
    const ranges = [
      { min: 0, max: 1000, label: '0 - 1K' },
      { min: 1000, max: 5000, label: '1K - 5K' },
      { min: 5000, max: 10000, label: '5K - 10K' },
      { min: 10000, max: 25000, label: '10K - 25K' },
      { min: 25000, max: 50000, label: '25K - 50K' },
      { min: 50000, max: Infinity, label: '50K+' }
    ];

    const distribution = ranges.map(range => {
      const paymentsInRange = payments.filter(p => p.amount >= range.min && p.amount < range.max);
      return {
        range: range.label,
        count: paymentsInRange.length,
        percentage: payments.length > 0 ? (paymentsInRange.length / payments.length) * 100 : 0,
        totalAmount: paymentsInRange.reduce((sum, p) => sum + p.amount, 0)
      };
    });

    return distribution;
  }

  private calculateBeneficiaryAnalytics(payments: any[]): BeneficiaryAnalytics[] {
    const beneficiaryMap = new Map<string, any[]>();

    payments.forEach(payment => {
      const beneficiary = payment.beneficiaryName;
      if (!beneficiaryMap.has(beneficiary)) {
        beneficiaryMap.set(beneficiary, []);
      }
      beneficiaryMap.get(beneficiary)!.push(payment);
    });

    const analytics: BeneficiaryAnalytics[] = [];

    beneficiaryMap.forEach((beneficiaryPayments, beneficiaryName) => {
      const totalAmount = beneficiaryPayments.reduce((sum, p) => sum + p.amount, 0);
      const lastPayment = beneficiaryPayments.reduce((latest, p) => 
        p.date > latest.date ? p : latest
      );

      analytics.push({
        beneficiaryName,
        paymentCount: beneficiaryPayments.length,
        totalAmount,
        averageAmount: totalAmount / beneficiaryPayments.length,
        lastPaymentDate: lastPayment.date
      });
    });

    return analytics.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  private getTopPayments(payments: any[], limit: number): PaymentSummary[] {
    return payments
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
      .map(p => ({
        id: p.id,
        beneficiaryName: p.beneficiaryName,
        amount: p.amount,
        date: p.date,
        status: p.status,
        reference: p.reference
      }));
  }

  // === CASH FLOW PROJECTIONS ===
  async generateCashFlowProjection(
    period: { start: Date; end: Date },
    projectionType: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<CashFlowProjection> {
    try {
      const projections = await this.calculateCashFlowProjections(period, projectionType);
      const summary = this.calculateCashFlowSummary(projections);
      const assumptions = this.getProjectionAssumptions();
      const riskFactors = this.identifyRiskFactors();

      return {
        period,
        projectionType,
        projections,
        summary,
        assumptions,
        riskFactors
      };
    } catch (error) {
      this.logger.error('Failed to generate cash flow projection:', error);
      throw error;
    }
  }

  private async calculateCashFlowProjections(
    period: { start: Date; end: Date },
    projectionType: 'daily' | 'weekly' | 'monthly'
  ): Promise<CashFlowPeriod[]> {
    const projections: CashFlowPeriod[] = [];
    let currentBalance = 100000; // Starting balance
    
    const periodLength = projectionType === 'daily' ? 1 : projectionType === 'weekly' ? 7 : 30;
    const totalPeriods = Math.ceil(
      (period.end.getTime() - period.start.getTime()) / (periodLength * 24 * 60 * 60 * 1000)
    );

    for (let i = 0; i < totalPeriods; i++) {
      const periodStart = new Date(period.start.getTime() + i * periodLength * 24 * 60 * 60 * 1000);
      const dateStr = periodStart.toISOString().split('T')[0];

      // Mock scheduled and projected outflows
      const scheduledOutflows = this.getScheduledOutflows(periodStart, periodLength);
      const projectedOutflows = scheduledOutflows * (1 + (Math.random() * 0.2 - 0.1)); // ±10% variance
      const estimatedInflows = this.getEstimatedInflows(periodStart, periodLength);

      const netFlow = estimatedInflows - projectedOutflows;
      currentBalance += netFlow;

      const confidence = this.calculateProjectionConfidence(i, totalPeriods);

      projections.push({
        date: dateStr,
        scheduledOutflows,
        projectedOutflows,
        estimatedInflows,
        netFlow,
        cumulativeBalance: currentBalance,
        confidence
      });
    }

    return projections;
  }

  private getScheduledOutflows(date: Date, periodLength: number): number {
    // Mock scheduled outflows based on historical patterns
    const baseDaily = 15000 + Math.random() * 10000; // 15K-25K daily average
    const weekdayMultiplier = [0.7, 1.2, 1.1, 1.0, 1.3, 0.8, 0.6]; // Lower on weekends
    const dayOfWeek = date.getDay();
    
    return baseDaily * weekdayMultiplier[dayOfWeek] * periodLength;
  }

  private getEstimatedInflows(date: Date, periodLength: number): number {
    // Mock estimated inflows (typically lower and less predictable)
    const baseDaily = 5000 + Math.random() * 8000; // 5K-13K daily average
    return baseDaily * periodLength;
  }

  private calculateProjectionConfidence(periodIndex: number, totalPeriods: number): number {
    // Confidence decreases over time
    const baseConfidence = 0.95;
    const decayRate = 0.05;
    return Math.max(0.5, baseConfidence - (periodIndex / totalPeriods) * decayRate);
  }

  private calculateCashFlowSummary(projections: CashFlowPeriod[]): CashFlowProjection['summary'] {
    const totalInflow = projections.reduce((sum, p) => sum + p.estimatedInflows, 0);
    const totalOutflow = projections.reduce((sum, p) => sum + p.projectedOutflows, 0);
    const netCashFlow = totalInflow - totalOutflow;
    const averageDailyOutflow = totalOutflow / projections.length;
    const projectedBalance = projections[projections.length - 1]?.cumulativeBalance || 0;

    return {
      totalInflow,
      totalOutflow,
      netCashFlow,
      averageDailyOutflow,
      projectedBalance
    };
  }

  private getProjectionAssumptions(): ProjectionAssumption[] {
    return [
      {
        category: 'Payment Volume',
        description: 'Daily payment volume remains consistent with historical average',
        value: 15000,
        impact: 'high'
      },
      {
        category: 'Seasonal Variation',
        description: 'No significant seasonal variations expected',
        value: 0.05,
        impact: 'medium'
      },
      {
        category: 'Processing Delays',
        description: 'Normal processing delays of 1-2 business days',
        value: 1.5,
        impact: 'medium'
      },
      {
        category: 'Exchange Rates',
        description: 'Stable exchange rates for foreign currency payments',
        value: 0.02,
        impact: 'low'
      }
    ];
  }

  private identifyRiskFactors(): RiskFactor[] {
    return [
      {
        factor: 'Large Payment Concentration',
        probability: 0.3,
        impact: 0.8,
        description: 'Risk of large payments clustering in short time periods',
        mitigation: 'Implement payment scheduling and limits'
      },
      {
        factor: 'Bank Processing Delays',
        probability: 0.15,
        impact: 0.6,
        description: 'Potential delays in bank processing during peak periods',
        mitigation: 'Diversify banking relationships and maintain buffer'
      },
      {
        factor: 'System Downtime',
        probability: 0.05,
        impact: 0.9,
        description: 'Risk of payment system unavailability',
        mitigation: 'Implement redundant systems and manual backup procedures'
      },
      {
        factor: 'Regulatory Changes',
        probability: 0.1,
        impact: 0.4,
        description: 'Changes in payment regulations affecting processing',
        mitigation: 'Monitor regulatory updates and maintain compliance buffer'
      }
    ];
  }

  // === REPORT GENERATION ===
  async generateFinancialReport(
    type: FinancialReport['type'],
    period: { start: Date; end: Date },
    format: FinancialReport['format'] = 'json',
    userId: string
  ): Promise<FinancialReport> {
    try {
      const reportId = `report_${Date.now()}`;
      
      let data: any;
      let title: string;

      switch (type) {
        case 'payment_analytics':
          data = await this.generatePaymentAnalytics(period);
          title = 'Payment Analytics Report';
          break;
        
        case 'cash_flow':
          data = await this.generateCashFlowProjection(period);
          title = 'Cash Flow Projection Report';
          break;
        
        case 'reconciliation':
          data = await this.generateReconciliationReport(period);
          title = 'Reconciliation Report';
          break;
        
        case 'compliance':
          data = await this.generateComplianceReport(period);
          title = 'Compliance Report';
          break;
        
        default:
          throw new Error(`Unsupported report type: ${type}`);
      }

      const report: FinancialReport = {
        id: reportId,
        type,
        title,
        period,
        data,
        generatedAt: new Date(),
        generatedBy: userId,
        format,
        status: 'completed'
      };

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'FINANCIAL_REPORT_GENERATED',
          details: {
            reportId,
            type,
            period: {
              start: period.start.toISOString(),
              end: period.end.toISOString()
            },
            format
          }
        }
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to generate financial report:', error);
      throw error;
    }
  }

  private async generateReconciliationReport(period: { start: Date; end: Date }): Promise<any> {
    return {
      period,
      summary: {
        totalStatements: 8,
        processedStatements: 7,
        reconciliationRate: 87.5,
        totalExceptions: 15,
        resolvedExceptions: 12
      },
      details: {
        matchedTransactions: 234,
        unmatchedTransactions: 18,
        manualMatches: 5,
        averageMatchConfidence: 0.92
      }
    };
  }

  private async generateComplianceReport(period: { start: Date; end: Date }): Promise<any> {
    return {
      period,
      summary: {
        totalPayments: 456,
        compliantPayments: 451,
        complianceRate: 98.9,
        flaggedPayments: 5,
        resolvedFlags: 3
      },
      details: {
        amlChecks: { passed: 456, failed: 0 },
        sanctionScreening: { passed: 454, flagged: 2 },
        documentationCompliance: { complete: 448, incomplete: 8 },
        regulatoryReporting: { submitted: 12, pending: 1 }
      }
    };
  }

  async getReportHistory(userId?: string, limit = 50): Promise<FinancialReport[]> {
    try {
      // Mock report history
      return Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
        id: `report_${i + 1}`,
        type: ['payment_analytics', 'cash_flow', 'reconciliation', 'compliance'][i % 4] as FinancialReport['type'],
        title: `Financial Report ${i + 1}`,
        period: {
          start: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
        },
        data: {},
        generatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        generatedBy: userId || 'system',
        format: 'json' as const,
        status: 'completed' as const
      }));
    } catch (error) {
      this.logger.error('Failed to get report history:', error);
      return [];
    }
  }

  async getFinancialKPIs(period: { start: Date; end: Date }): Promise<any> {
    try {
      const analytics = await this.generatePaymentAnalytics(period);
      const cashFlow = await this.generateCashFlowProjection(period);

      return {
        paymentVolume: {
          total: analytics.summary.totalPayments,
          change: Math.random() * 20 - 10, // Mock change percentage
          trend: 'up'
        },
        paymentValue: {
          total: analytics.summary.totalAmount,
          change: Math.random() * 15 - 7.5,
          trend: 'up'
        },
        successRate: {
          rate: analytics.summary.successRate,
          change: Math.random() * 5 - 2.5,
          trend: 'stable'
        },
        averageAmount: {
          amount: analytics.summary.averageAmount,
          change: Math.random() * 10 - 5,
          trend: 'stable'
        },
        cashPosition: {
          current: cashFlow.summary.projectedBalance,
          projected: cashFlow.summary.projectedBalance + cashFlow.summary.netCashFlow,
          trend: cashFlow.summary.netCashFlow > 0 ? 'up' : 'down'
        },
        processingTime: {
          average: 2.3, // hours
          change: Math.random() * 1 - 0.5,
          trend: 'down'
        }
      };
    } catch (error) {
      this.logger.error('Failed to get financial KPIs:', error);
      return {};
    }
  }
}