import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BankStatement {
  id: string;
  bankCode: string;
  accountNumber: string;
  statementDate: Date;
  openingBalance: number;
  closingBalance: number;
  transactions: BankTransaction[];
  currency: string;
  importedAt: Date;
  processedAt?: Date;
  status: 'imported' | 'processing' | 'reconciled' | 'exception';
}

export interface BankTransaction {
  id: string;
  transactionDate: Date;
  valueDate: Date;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
  transactionCode?: string;
  matched: boolean;
  matchedPaymentId?: string;
  matchConfidence?: number;
}

export interface ReconciliationMatch {
  paymentId: string;
  transactionId: string;
  matchType: 'exact' | 'fuzzy' | 'manual';
  confidence: number;
  matchCriteria: MatchCriteria[];
  discrepancies: Discrepancy[];
}

export interface MatchCriteria {
  field: string;
  paymentValue: any;
  transactionValue: any;
  match: boolean;
  weight: number;
}

export interface Discrepancy {
  field: string;
  paymentValue: any;
  transactionValue: any;
  severity: 'minor' | 'major' | 'critical';
  description: string;
}

export interface ReconciliationException {
  id: string;
  type: 'unmatched_payment' | 'unmatched_transaction' | 'amount_mismatch' | 'date_mismatch' | 'duplicate_match';
  paymentId?: string;
  transactionId?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedActions: string[];
  status: 'open' | 'investigating' | 'resolved' | 'ignored';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export interface ReconciliationReport {
  statementId: string;
  period: { start: Date; end: Date };
  summary: {
    totalPayments: number;
    totalTransactions: number;
    matchedPayments: number;
    matchedTransactions: number;
    unmatchedPayments: number;
    unmatchedTransactions: number;
    exceptions: number;
    reconciliationRate: number;
  };
  matches: ReconciliationMatch[];
  exceptions: ReconciliationException[];
  generatedAt: Date;
}

@Injectable()
export class AutomatedReconciliationService {
  private readonly logger = new Logger(AutomatedReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  // === BANK STATEMENT PROCESSING ===
  async importBankStatement(statementData: any): Promise<BankStatement> {
    try {
      const statement: BankStatement = {
        id: `stmt_${Date.now()}`,
        bankCode: statementData.bankCode,
        accountNumber: statementData.accountNumber,
        statementDate: new Date(statementData.statementDate),
        openingBalance: Number(statementData.openingBalance),
        closingBalance: Number(statementData.closingBalance),
        transactions: statementData.transactions.map((t: any, index: number) => ({
          id: `txn_${Date.now()}_${index}`,
          transactionDate: new Date(t.transactionDate),
          valueDate: new Date(t.valueDate),
          amount: Number(t.amount),
          currency: t.currency,
          description: t.description,
          reference: t.reference,
          counterpartyName: t.counterpartyName,
          counterpartyAccount: t.counterpartyAccount,
          transactionCode: t.transactionCode,
          matched: false
        })),
        currency: statementData.currency,
        importedAt: new Date(),
        status: 'imported'
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'BANK_STATEMENT_IMPORTED',
          details: {
            statementId: statement.id,
            bankCode: statement.bankCode,
            transactionCount: statement.transactions.length,
            amount: statement.closingBalance - statement.openingBalance
          }
        }
      });

      return statement;
    } catch (error) {
      this.logger.error('Failed to import bank statement:', error);
      throw error;
    }
  }

  async processBankStatement(statementId: string): Promise<ReconciliationReport> {
    try {
      const statement = await this.getBankStatement(statementId);
      if (!statement) {
        throw new Error('Bank statement not found');
      }

      // Update status to processing
      statement.status = 'processing';

      // Get pending payments for reconciliation
      const pendingPayments = await this.getPendingPayments(statement.statementDate);

      // Perform automatic matching
      const matches: ReconciliationMatch[] = [];
      const exceptions: ReconciliationException[] = [];

      for (const transaction of statement.transactions) {
        const matchResult = await this.findMatchingPayment(transaction, pendingPayments);
        
        if (matchResult) {
          matches.push(matchResult);
          transaction.matched = true;
          transaction.matchedPaymentId = matchResult.paymentId;
          transaction.matchConfidence = matchResult.confidence;

          // Remove matched payment from pending list
          const paymentIndex = pendingPayments.findIndex(p => p.id === matchResult.paymentId);
          if (paymentIndex > -1) {
            pendingPayments.splice(paymentIndex, 1);
          }
        } else {
          // Create exception for unmatched transaction
          exceptions.push({
            id: `exc_${Date.now()}_${transaction.id}`,
            type: 'unmatched_transaction',
            transactionId: transaction.id,
            description: `Unmatched bank transaction: ${transaction.description}`,
            severity: this.calculateExceptionSeverity(transaction.amount),
            suggestedActions: [
              'Review transaction details',
              'Check for manual payment entries',
              'Verify counterparty information'
            ],
            status: 'open',
            createdAt: new Date()
          });
        }
      }

      // Create exceptions for unmatched payments
      for (const payment of pendingPayments) {
        exceptions.push({
          id: `exc_${Date.now()}_${payment.id}`,
          type: 'unmatched_payment',
          paymentId: payment.id,
          description: `Unmatched payment: ${payment.beneficiaryName}`,
          severity: this.calculateExceptionSeverity(payment.amount),
          suggestedActions: [
            'Check if payment is still pending',
            'Verify payment execution date',
            'Review bank statement completeness'
          ],
          status: 'open',
          createdAt: new Date()
        });
      }

      // Update statement status
      statement.status = exceptions.length === 0 ? 'reconciled' : 'exception';
      statement.processedAt = new Date();

      // Generate reconciliation report
      const report: ReconciliationReport = {
        statementId: statement.id,
        period: {
          start: new Date(statement.statementDate.getTime() - 24 * 60 * 60 * 1000),
          end: statement.statementDate
        },
        summary: {
          totalPayments: pendingPayments.length + matches.length,
          totalTransactions: statement.transactions.length,
          matchedPayments: matches.length,
          matchedTransactions: matches.length,
          unmatchedPayments: pendingPayments.length,
          unmatchedTransactions: statement.transactions.filter(t => !t.matched).length,
          exceptions: exceptions.length,
          reconciliationRate: statement.transactions.length > 0 ? 
            (matches.length / statement.transactions.length) * 100 : 0
        },
        matches,
        exceptions,
        generatedAt: new Date()
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'RECONCILIATION_COMPLETED',
          details: {
            statementId,
            matchedTransactions: matches.length,
            exceptions: exceptions.length,
            reconciliationRate: report.summary.reconciliationRate
          }
        }
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to process bank statement:', error);
      throw error;
    }
  }

  // === MATCHING ALGORITHMS ===
  private async findMatchingPayment(transaction: BankTransaction, payments: any[]): Promise<ReconciliationMatch | null> {
    let bestMatch: ReconciliationMatch | null = null;
    let highestConfidence = 0;

    for (const payment of payments) {
      const match = await this.calculateMatch(transaction, payment);
      
      if (match.confidence > highestConfidence && match.confidence >= 0.7) {
        highestConfidence = match.confidence;
        bestMatch = match;
      }
    }

    return bestMatch;
  }

  private async calculateMatch(transaction: BankTransaction, payment: any): Promise<ReconciliationMatch> {
    const criteria: MatchCriteria[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    // Amount matching (highest weight)
    const amountMatch = Math.abs(transaction.amount - payment.amount) < 0.01;
    const amountCriteria: MatchCriteria = {
      field: 'amount',
      paymentValue: payment.amount,
      transactionValue: transaction.amount,
      match: amountMatch,
      weight: 0.4
    };
    criteria.push(amountCriteria);
    totalWeight += amountCriteria.weight;
    if (amountMatch) matchedWeight += amountCriteria.weight;

    // Date matching (medium weight)
    const dateDiff = Math.abs(transaction.valueDate.getTime() - new Date(payment.executionDate).getTime());
    const dateMatch = dateDiff <= 3 * 24 * 60 * 60 * 1000; // Within 3 days
    const dateCriteria: MatchCriteria = {
      field: 'date',
      paymentValue: payment.executionDate,
      transactionValue: transaction.valueDate,
      match: dateMatch,
      weight: 0.25
    };
    criteria.push(dateCriteria);
    totalWeight += dateCriteria.weight;
    if (dateMatch) matchedWeight += dateCriteria.weight;

    // Reference matching (medium weight)
    const referenceMatch = this.fuzzyMatch(transaction.reference || '', payment.reference || '');
    const referenceCriteria: MatchCriteria = {
      field: 'reference',
      paymentValue: payment.reference,
      transactionValue: transaction.reference,
      match: referenceMatch > 0.8,
      weight: 0.2
    };
    criteria.push(referenceCriteria);
    totalWeight += referenceCriteria.weight;
    if (referenceCriteria.match) matchedWeight += referenceCriteria.weight;

    // Counterparty name matching (lower weight)
    const nameMatch = this.fuzzyMatch(
      transaction.counterpartyName || '', 
      payment.beneficiaryName || ''
    );
    const nameCriteria: MatchCriteria = {
      field: 'counterpartyName',
      paymentValue: payment.beneficiaryName,
      transactionValue: transaction.counterpartyName,
      match: nameMatch > 0.7,
      weight: 0.15
    };
    criteria.push(nameCriteria);
    totalWeight += nameCriteria.weight;
    if (nameCriteria.match) matchedWeight += nameCriteria.weight;

    const confidence = totalWeight > 0 ? (matchedWeight / totalWeight) : 0;
    const matchType = confidence >= 0.95 ? 'exact' : 'fuzzy';

    // Identify discrepancies
    const discrepancies: Discrepancy[] = [];
    for (const criterion of criteria) {
      if (!criterion.match) {
        discrepancies.push({
          field: criterion.field,
          paymentValue: criterion.paymentValue,
          transactionValue: criterion.transactionValue,
          severity: this.getDiscrepancySeverity(criterion.field, criterion.paymentValue, criterion.transactionValue),
          description: `Mismatch in ${criterion.field}`
        });
      }
    }

    return {
      paymentId: payment.id,
      transactionId: transaction.id,
      matchType,
      confidence: Math.round(confidence * 100) / 100,
      matchCriteria: criteria,
      discrepancies
    };
  }

  private fuzzyMatch(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    // Simple Levenshtein distance-based similarity
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(s1, s2);
    return (maxLength - distance) / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private getDiscrepancySeverity(field: string, paymentValue: any, transactionValue: any): 'minor' | 'major' | 'critical' {
    switch (field) {
      case 'amount':
        const amountDiff = Math.abs(Number(paymentValue) - Number(transactionValue));
        if (amountDiff > 1000) return 'critical';
        if (amountDiff > 100) return 'major';
        return 'minor';
      
      case 'date':
        const dateDiff = Math.abs(new Date(paymentValue).getTime() - new Date(transactionValue).getTime());
        const daysDiff = dateDiff / (24 * 60 * 60 * 1000);
        if (daysDiff > 7) return 'major';
        if (daysDiff > 3) return 'minor';
        return 'minor';
      
      default:
        return 'minor';
    }
  }

  private calculateExceptionSeverity(amount: number): 'low' | 'medium' | 'high' {
    if (amount > 10000) return 'high';
    if (amount > 1000) return 'medium';
    return 'low';
  }

  // === EXCEPTION HANDLING ===
  async getReconciliationExceptions(filters?: any): Promise<ReconciliationException[]> {
    try {
      // Mock exceptions data
      return [
        {
          id: 'exc_001',
          type: 'unmatched_payment',
          paymentId: 'pay_001',
          description: 'Payment to ACME Corp not found in bank statement',
          severity: 'medium',
          suggestedActions: [
            'Check if payment is still pending',
            'Verify payment execution date',
            'Contact bank for transaction status'
          ],
          status: 'open',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'exc_002',
          type: 'amount_mismatch',
          paymentId: 'pay_002',
          transactionId: 'txn_002',
          description: 'Amount mismatch: Payment €1,500.00 vs Transaction €1,485.50',
          severity: 'high',
          suggestedActions: [
            'Review bank charges and fees',
            'Check for currency conversion',
            'Verify payment amount accuracy'
          ],
          status: 'investigating',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ];
    } catch (error) {
      this.logger.error('Failed to get reconciliation exceptions:', error);
      return [];
    }
  }

  async resolveException(exceptionId: string, resolution: string, userId: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'EXCEPTION_RESOLVED',
          details: {
            exceptionId,
            resolution,
            resolvedAt: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to resolve exception:', error);
      throw error;
    }
  }

  async createManualMatch(paymentId: string, transactionId: string, userId: string): Promise<ReconciliationMatch> {
    try {
      const match: ReconciliationMatch = {
        paymentId,
        transactionId,
        matchType: 'manual',
        confidence: 1.0,
        matchCriteria: [{
          field: 'manual',
          paymentValue: 'manual_match',
          transactionValue: 'manual_match',
          match: true,
          weight: 1.0
        }],
        discrepancies: []
      };

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'MANUAL_MATCH_CREATED',
          details: {
            paymentId,
            transactionId,
            matchType: 'manual'
          }
        }
      });

      return match;
    } catch (error) {
      this.logger.error('Failed to create manual match:', error);
      throw error;
    }
  }

  // === REPORTING ===
  async getReconciliationReports(period?: { start: Date; end: Date }): Promise<ReconciliationReport[]> {
    try {
      // Mock reports data
      return [
        {
          statementId: 'stmt_001',
          period: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          summary: {
            totalPayments: 156,
            totalTransactions: 142,
            matchedPayments: 138,
            matchedTransactions: 138,
            unmatchedPayments: 18,
            unmatchedTransactions: 4,
            exceptions: 22,
            reconciliationRate: 88.5
          },
          matches: [],
          exceptions: [],
          generatedAt: new Date()
        }
      ];
    } catch (error) {
      this.logger.error('Failed to get reconciliation reports:', error);
      return [];
    }
  }

  async getReconciliationStatistics(period = '30d'): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));

      return {
        totalStatements: 12,
        processedStatements: 11,
        totalTransactions: 1456,
        matchedTransactions: 1289,
        unmatchedTransactions: 167,
        totalExceptions: 89,
        resolvedExceptions: 67,
        averageReconciliationRate: 88.5,
        averageProcessingTime: 2.3, // hours
        matchingAccuracy: 94.2,
        exceptionResolutionRate: 75.3,
        period
      };
    } catch (error) {
      this.logger.error('Failed to get reconciliation statistics:', error);
      return {
        totalStatements: 0,
        processedStatements: 0,
        totalTransactions: 0,
        matchedTransactions: 0,
        unmatchedTransactions: 0,
        totalExceptions: 0,
        resolvedExceptions: 0,
        averageReconciliationRate: 0,
        averageProcessingTime: 0,
        matchingAccuracy: 0,
        exceptionResolutionRate: 0,
        period
      };
    }
  }

  // === HELPER METHODS ===
  private async getBankStatement(statementId: string): Promise<BankStatement | null> {
    // Mock bank statement retrieval
    return {
      id: statementId,
      bankCode: 'BNP',
      accountNumber: 'FR7630001007941234567890185',
      statementDate: new Date(),
      openingBalance: 50000.00,
      closingBalance: 48500.00,
      transactions: [],
      currency: 'EUR',
      importedAt: new Date(),
      status: 'imported'
    };
  }

  private async getPendingPayments(statementDate: Date): Promise<any[]> {
    // Mock pending payments retrieval
    return [
      {
        id: 'pay_001',
        amount: 1500.00,
        beneficiaryName: 'ACME Corporation',
        reference: 'INV-2024-001',
        executionDate: new Date(statementDate.getTime() - 24 * 60 * 60 * 1000)
      },
      {
        id: 'pay_002',
        amount: 750.50,
        beneficiaryName: 'Tech Solutions Ltd',
        reference: 'SERV-2024-045',
        executionDate: statementDate
      }
    ];
  }
}