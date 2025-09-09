import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BankFormatConfig {
  id: string;
  name: string;
  bankCode: string;
  formatType: 'STRUCTURE_1' | 'STRUCTURE_2' | 'STRUCTURE_3';
  specifications: {
    headerFormat: string;
    detailFormat: string;
    footerFormat: string;
    fieldSeparator?: string;
    lineLength?: number;
    dateFormat: string;
    amountFormat: string;
  };
  active: boolean;
}

@Injectable()
export class BankFormatConfigService {
  private readonly logger = new Logger(BankFormatConfigService.name);

  constructor(private prisma: PrismaService) {}

  async getBankFormats(): Promise<BankFormatConfig[]> {
    return [
      {
        id: 'amen_bank',
        name: 'AMEN BANK',
        bankCode: 'AMEN',
        formatType: 'STRUCTURE_1',
        specifications: {
          headerFormat: 'H{reference:20}{date:8}{count:6}{amount:15}{rib:20}{name:30}{filler:23}',
          detailFormat: 'D{seq:6}{rib:20}{name:30}{amount:15}{motif:35}{filler:13}',
          footerFormat: 'T{count:6}{amount:15}{filler:98}',
          lineLength: 120,
          dateFormat: 'YYYYMMDD',
          amountFormat: 'millimes'
        },
        active: true
      },
      {
        id: 'banque_populaire',
        name: 'BANQUE POPULAIRE',
        bankCode: 'BP',
        formatType: 'STRUCTURE_2',
        specifications: {
          headerFormat: '01|{reference:16}|{date:10}|{rib}|{name:35}|TND|{count:5}',
          detailFormat: '02|{seq:5}|{rib}|{name:35}|{amount}|TND|{motif:140}|{date:10}',
          footerFormat: '03|{count:5}|{amount}|TND',
          fieldSeparator: '|',
          dateFormat: 'DDMMYYYY',
          amountFormat: 'decimal3'
        },
        active: true
      },
      {
        id: 'stb_bank',
        name: 'STB (Société Tunisienne de Banque)',
        bankCode: 'STB',
        formatType: 'STRUCTURE_3',
        specifications: {
          headerFormat: 'HEADER;{reference};{date};{rib};"{name}";{count};{amount};TND',
          detailFormat: 'DETAIL;{seq};{rib};"{name}";{amount};TND;"{motif}";{date};{matricule}',
          footerFormat: 'FOOTER;{count};;;{amount};TND;"{reference}";{date};',
          fieldSeparator: ';',
          dateFormat: 'DD/MM/YYYY',
          amountFormat: 'decimal3'
        },
        active: true
      }
    ];
  }

  async getBankFormat(formatId: string): Promise<BankFormatConfig | null> {
    const formats = await this.getBankFormats();
    return formats.find(f => f.id === formatId) || null;
  }

  async updateBankFormat(formatId: string, config: Partial<BankFormatConfig>): Promise<BankFormatConfig> {
    // In a real implementation, this would update the database
    // For now, we'll return the updated config
    const existing = await this.getBankFormat(formatId);
    if (!existing) {
      throw new Error('Bank format not found');
    }

    const updated = { ...existing, ...config };
    
    // Log the update
    await this.prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        action: 'BANK_FORMAT_UPDATED',
        details: {
          formatId,
          changes: config
        }
      }
    });

    return updated;
  }

  async validateFormatSpecification(formatType: string, specifications: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!specifications.headerFormat) {
      errors.push('Header format is required');
    }
    if (!specifications.detailFormat) {
      errors.push('Detail format is required');
    }
    if (!specifications.dateFormat) {
      errors.push('Date format is required');
    }
    if (!specifications.amountFormat) {
      errors.push('Amount format is required');
    }

    // Validate format-specific requirements
    switch (formatType) {
      case 'STRUCTURE_1':
        if (!specifications.lineLength || specifications.lineLength !== 120) {
          errors.push('Structure 1 requires fixed line length of 120 characters');
        }
        break;
      case 'STRUCTURE_2':
      case 'STRUCTURE_3':
        if (!specifications.fieldSeparator) {
          errors.push('Field separator is required for this format');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}