import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BankFormat {
  id: string;
  name: string;
  bankCode: string;
  country: string;
  formatType: 'SEPA' | 'SWIFT' | 'ACH' | 'DOMESTIC' | 'CUSTOM';
  fields: BankFormatField[];
  validation: BankFormatValidation;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankFormatField {
  name: string;
  type: 'string' | 'number' | 'date' | 'amount' | 'iban' | 'bic';
  required: boolean;
  maxLength?: number;
  pattern?: string;
  position?: number;
  description: string;
}

export interface BankFormatValidation {
  ibanValidation: boolean;
  bicValidation: boolean;
  amountValidation: boolean;
  dateValidation: boolean;
  customRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface FormatConversionResult {
  success: boolean;
  data?: any;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
  rule: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value: any;
  suggestion?: string;
}

@Injectable()
export class MultiBankFormatService {
  private readonly logger = new Logger(MultiBankFormatService.name);

  constructor(private prisma: PrismaService) {}

  // === BANK FORMAT MANAGEMENT ===
  async getBankFormats(): Promise<BankFormat[]> {
    try {
      return [
        {
          id: 'sepa_credit_transfer',
          name: 'SEPA Credit Transfer',
          bankCode: 'SEPA',
          country: 'EU',
          formatType: 'SEPA',
          fields: [
            { name: 'messageId', type: 'string', required: true, maxLength: 35, description: 'Message Identification' },
            { name: 'creationDateTime', type: 'date', required: true, description: 'Creation Date Time' },
            { name: 'numberOfTransactions', type: 'number', required: true, description: 'Number of Transactions' },
            { name: 'controlSum', type: 'amount', required: true, description: 'Control Sum' },
            { name: 'debtorName', type: 'string', required: true, maxLength: 70, description: 'Debtor Name' },
            { name: 'debtorIban', type: 'iban', required: true, description: 'Debtor IBAN' },
            { name: 'debtorBic', type: 'bic', required: true, description: 'Debtor BIC' },
            { name: 'creditorName', type: 'string', required: true, maxLength: 70, description: 'Creditor Name' },
            { name: 'creditorIban', type: 'iban', required: true, description: 'Creditor IBAN' },
            { name: 'creditorBic', type: 'bic', required: false, description: 'Creditor BIC' },
            { name: 'amount', type: 'amount', required: true, description: 'Transaction Amount' },
            { name: 'currency', type: 'string', required: true, maxLength: 3, pattern: '^[A-Z]{3}$', description: 'Currency Code' },
            { name: 'remittanceInfo', type: 'string', required: false, maxLength: 140, description: 'Remittance Information' }
          ],
          validation: {
            ibanValidation: true,
            bicValidation: true,
            amountValidation: true,
            dateValidation: true,
            customRules: [
              { field: 'currency', rule: 'must_be_EUR', message: 'Currency must be EUR for SEPA transfers', severity: 'error' },
              { field: 'amount', rule: 'max_999999999', message: 'Amount cannot exceed 999,999,999.99', severity: 'error' }
            ]
          },
          active: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        {
          id: 'swift_mt103',
          name: 'SWIFT MT103',
          bankCode: 'SWIFT',
          country: 'INTERNATIONAL',
          formatType: 'SWIFT',
          fields: [
            { name: 'senderReference', type: 'string', required: true, maxLength: 16, description: 'Sender Reference' },
            { name: 'bankOperationCode', type: 'string', required: false, maxLength: 4, description: 'Bank Operation Code' },
            { name: 'instructionCode', type: 'string', required: false, maxLength: 4, description: 'Instruction Code' },
            { name: 'valueDate', type: 'date', required: true, description: 'Value Date' },
            { name: 'currency', type: 'string', required: true, maxLength: 3, description: 'Currency Code' },
            { name: 'amount', type: 'amount', required: true, description: 'Transaction Amount' },
            { name: 'orderingCustomer', type: 'string', required: true, maxLength: 140, description: 'Ordering Customer' },
            { name: 'orderingInstitution', type: 'string', required: false, maxLength: 140, description: 'Ordering Institution' },
            { name: 'sendersCorrespondent', type: 'string', required: false, maxLength: 140, description: 'Senders Correspondent' },
            { name: 'receiversCorrespondent', type: 'string', required: false, maxLength: 140, description: 'Receivers Correspondent' },
            { name: 'beneficiaryCustomer', type: 'string', required: true, maxLength: 140, description: 'Beneficiary Customer' },
            { name: 'remittanceInfo', type: 'string', required: false, maxLength: 140, description: 'Remittance Information' }
          ],
          validation: {
            ibanValidation: false,
            bicValidation: true,
            amountValidation: true,
            dateValidation: true,
            customRules: [
              { field: 'senderReference', rule: 'unique_per_day', message: 'Sender reference must be unique per day', severity: 'error' },
              { field: 'amount', rule: 'min_0_01', message: 'Amount must be at least 0.01', severity: 'error' }
            ]
          },
          active: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-10')
        },
        {
          id: 'french_domestic',
          name: 'French Domestic Transfer',
          bankCode: 'FR_DOM',
          country: 'FR',
          formatType: 'DOMESTIC',
          fields: [
            { name: 'numeroOrdre', type: 'string', required: true, maxLength: 20, description: 'Numéro d\'ordre' },
            { name: 'dateExecution', type: 'date', required: true, description: 'Date d\'exécution' },
            { name: 'nomDebiteur', type: 'string', required: true, maxLength: 35, description: 'Nom du débiteur' },
            { name: 'ibanDebiteur', type: 'iban', required: true, description: 'IBAN du débiteur' },
            { name: 'nomBeneficiaire', type: 'string', required: true, maxLength: 35, description: 'Nom du bénéficiaire' },
            { name: 'ibanBeneficiaire', type: 'iban', required: true, description: 'IBAN du bénéficiaire' },
            { name: 'montant', type: 'amount', required: true, description: 'Montant' },
            { name: 'devise', type: 'string', required: true, maxLength: 3, pattern: '^EUR$', description: 'Devise' },
            { name: 'motif', type: 'string', required: false, maxLength: 140, description: 'Motif du virement' },
            { name: 'reference', type: 'string', required: false, maxLength: 35, description: 'Référence' }
          ],
          validation: {
            ibanValidation: true,
            bicValidation: false,
            amountValidation: true,
            dateValidation: true,
            customRules: [
              { field: 'devise', rule: 'must_be_EUR', message: 'La devise doit être EUR', severity: 'error' },
              { field: 'ibanDebiteur', rule: 'french_iban', message: 'IBAN débiteur doit être français', severity: 'warning' }
            ]
          },
          active: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-05')
        }
      ];
    } catch (error) {
      this.logger.error('Failed to get bank formats:', error);
      return [];
    }
  }

  async createBankFormat(format: Omit<BankFormat, 'id' | 'createdAt' | 'updatedAt'>): Promise<BankFormat> {
    try {
      const newFormat: BankFormat = {
        id: `format_${Date.now()}`,
        ...format,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'BANK_FORMAT_CREATED',
          details: {
            formatId: newFormat.id,
            name: newFormat.name,
            bankCode: newFormat.bankCode
          }
        }
      });

      return newFormat;
    } catch (error) {
      this.logger.error('Failed to create bank format:', error);
      throw error;
    }
  }

  // === FORMAT VALIDATION ===
  async validatePaymentData(formatId: string, data: any): Promise<FormatConversionResult> {
    try {
      const format = await this.getBankFormat(formatId);
      if (!format) {
        return {
          success: false,
          errors: [{ field: 'format', message: 'Bank format not found', value: formatId, rule: 'format_exists' }],
          warnings: []
        };
      }

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Validate required fields
      for (const field of format.fields) {
        if (field.required && (!data[field.name] || data[field.name] === '')) {
          errors.push({
            field: field.name,
            message: `${field.description} is required`,
            value: data[field.name],
            rule: 'required'
          });
        }
      }

      // Validate field types and constraints
      for (const field of format.fields) {
        const value = data[field.name];
        if (value !== undefined && value !== null && value !== '') {
          const fieldErrors = await this.validateField(field, value);
          errors.push(...fieldErrors);
        }
      }

      // Apply custom validation rules
      for (const rule of format.validation.customRules) {
        const ruleResult = await this.applyCustomRule(rule, data);
        if (ruleResult) {
          if (rule.severity === 'error') {
            errors.push(ruleResult);
          } else {
            warnings.push({
              field: ruleResult.field,
              message: ruleResult.message,
              value: ruleResult.value,
              suggestion: 'Please review this field'
            });
          }
        }
      }

      // Apply format-specific validations
      if (format.validation.ibanValidation) {
        const ibanErrors = this.validateIbans(data, format.fields);
        errors.push(...ibanErrors);
      }

      if (format.validation.bicValidation) {
        const bicErrors = this.validateBics(data, format.fields);
        errors.push(...bicErrors);
      }

      if (format.validation.amountValidation) {
        const amountErrors = this.validateAmounts(data, format.fields);
        errors.push(...amountErrors);
      }

      return {
        success: errors.length === 0,
        data: errors.length === 0 ? this.formatPaymentData(format, data) : undefined,
        errors,
        warnings
      };
    } catch (error) {
      this.logger.error('Failed to validate payment data:', error);
      return {
        success: false,
        errors: [{ field: 'system', message: 'Validation system error', value: null, rule: 'system_error' }],
        warnings: []
      };
    }
  }

  private async validateField(field: BankFormatField, value: any): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    switch (field.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: field.name,
            message: `${field.description} must be a string`,
            value,
            rule: 'type_string'
          });
        } else if (field.maxLength && value.length > field.maxLength) {
          errors.push({
            field: field.name,
            message: `${field.description} cannot exceed ${field.maxLength} characters`,
            value,
            rule: 'max_length'
          });
        } else if (field.pattern && !new RegExp(field.pattern).test(value)) {
          errors.push({
            field: field.name,
            message: `${field.description} format is invalid`,
            value,
            rule: 'pattern_match'
          });
        }
        break;

      case 'number':
        if (isNaN(Number(value))) {
          errors.push({
            field: field.name,
            message: `${field.description} must be a valid number`,
            value,
            rule: 'type_number'
          });
        }
        break;

      case 'amount':
        if (isNaN(Number(value)) || Number(value) < 0) {
          errors.push({
            field: field.name,
            message: `${field.description} must be a valid positive amount`,
            value,
            rule: 'type_amount'
          });
        }
        break;

      case 'date':
        if (!this.isValidDate(value)) {
          errors.push({
            field: field.name,
            message: `${field.description} must be a valid date`,
            value,
            rule: 'type_date'
          });
        }
        break;

      case 'iban':
        if (!this.validateIban(value)) {
          errors.push({
            field: field.name,
            message: `${field.description} is not a valid IBAN`,
            value,
            rule: 'iban_format'
          });
        }
        break;

      case 'bic':
        if (!this.validateBic(value)) {
          errors.push({
            field: field.name,
            message: `${field.description} is not a valid BIC`,
            value,
            rule: 'bic_format'
          });
        }
        break;
    }

    return errors;
  }

  private async applyCustomRule(rule: ValidationRule, data: any): Promise<ValidationError | null> {
    const value = data[rule.field];

    switch (rule.rule) {
      case 'must_be_EUR':
        if (value !== 'EUR') {
          return { field: rule.field, message: rule.message, value, rule: rule.rule };
        }
        break;

      case 'max_999999999':
        if (Number(value) > 999999999.99) {
          return { field: rule.field, message: rule.message, value, rule: rule.rule };
        }
        break;

      case 'min_0_01':
        if (Number(value) < 0.01) {
          return { field: rule.field, message: rule.message, value, rule: rule.rule };
        }
        break;

      case 'french_iban':
        if (typeof value === 'string' && !value.startsWith('FR')) {
          return { field: rule.field, message: rule.message, value, rule: rule.rule };
        }
        break;

      case 'unique_per_day':
        // Mock uniqueness check
        if (Math.random() < 0.05) {
          return { field: rule.field, message: rule.message, value, rule: rule.rule };
        }
        break;
    }

    return null;
  }

  private validateIbans(data: any, fields: BankFormatField[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const ibanFields = fields.filter(f => f.type === 'iban');

    for (const field of ibanFields) {
      const value = data[field.name];
      if (value && !this.validateIban(value)) {
        errors.push({
          field: field.name,
          message: `${field.description} is not a valid IBAN`,
          value,
          rule: 'iban_validation'
        });
      }
    }

    return errors;
  }

  private validateBics(data: any, fields: BankFormatField[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const bicFields = fields.filter(f => f.type === 'bic');

    for (const field of bicFields) {
      const value = data[field.name];
      if (value && !this.validateBic(value)) {
        errors.push({
          field: field.name,
          message: `${field.description} is not a valid BIC`,
          value,
          rule: 'bic_validation'
        });
      }
    }

    return errors;
  }

  private validateAmounts(data: any, fields: BankFormatField[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const amountFields = fields.filter(f => f.type === 'amount');

    for (const field of amountFields) {
      const value = data[field.name];
      if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
        errors.push({
          field: field.name,
          message: `${field.description} must be a positive amount`,
          value,
          rule: 'amount_validation'
        });
      }
    }

    return errors;
  }

  private validateIban(iban: string): boolean {
    if (!iban || typeof iban !== 'string') return false;
    
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Check length (15-34 characters)
    if (cleanIban.length < 15 || cleanIban.length > 34) return false;
    
    // Check format (2 letters + 2 digits + alphanumeric)
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) return false;
    
    // Mock IBAN checksum validation (simplified)
    return true;
  }

  private validateBic(bic: string): boolean {
    if (!bic || typeof bic !== 'string') return false;
    
    // BIC format: 4 letters (bank) + 2 letters (country) + 2 alphanumeric (location) + optional 3 alphanumeric (branch)
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.toUpperCase());
  }

  private isValidDate(date: any): boolean {
    if (!date) return false;
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  private formatPaymentData(format: BankFormat, data: any): any {
    const formatted = { ...data };
    
    // Apply format-specific transformations
    for (const field of format.fields) {
      const value = formatted[field.name];
      if (value !== undefined && value !== null) {
        switch (field.type) {
          case 'iban':
            formatted[field.name] = value.replace(/\s/g, '').toUpperCase();
            break;
          case 'bic':
            formatted[field.name] = value.toUpperCase();
            break;
          case 'amount':
            formatted[field.name] = Number(value).toFixed(2);
            break;
          case 'date':
            formatted[field.name] = new Date(value).toISOString().split('T')[0];
            break;
        }
      }
    }

    return formatted;
  }

  // === FORMAT CONVERSION ===
  async convertBetweenFormats(sourceFormatId: string, targetFormatId: string, data: any): Promise<FormatConversionResult> {
    try {
      const sourceFormat = await this.getBankFormat(sourceFormatId);
      const targetFormat = await this.getBankFormat(targetFormatId);

      if (!sourceFormat || !targetFormat) {
        return {
          success: false,
          errors: [{ field: 'format', message: 'Source or target format not found', value: null, rule: 'format_exists' }],
          warnings: []
        };
      }

      // Validate source data
      const sourceValidation = await this.validatePaymentData(sourceFormatId, data);
      if (!sourceValidation.success) {
        return sourceValidation;
      }

      // Map fields between formats
      const mappedData = this.mapFieldsBetweenFormats(sourceFormat, targetFormat, data);

      // Validate target data
      const targetValidation = await this.validatePaymentData(targetFormatId, mappedData);

      return targetValidation;
    } catch (error) {
      this.logger.error('Failed to convert between formats:', error);
      return {
        success: false,
        errors: [{ field: 'system', message: 'Format conversion error', value: null, rule: 'system_error' }],
        warnings: []
      };
    }
  }

  private mapFieldsBetweenFormats(sourceFormat: BankFormat, targetFormat: BankFormat, data: any): any {
    const mapped: any = {};

    // Common field mappings
    const fieldMappings = {
      'debtorName': ['nomDebiteur', 'orderingCustomer'],
      'creditorName': ['nomBeneficiaire', 'beneficiaryCustomer'],
      'debtorIban': ['ibanDebiteur'],
      'creditorIban': ['ibanBeneficiaire'],
      'amount': ['montant'],
      'currency': ['devise'],
      'remittanceInfo': ['motif', 'reference']
    };

    // Map fields based on common mappings
    for (const [commonField, variants] of Object.entries(fieldMappings)) {
      // Find source field
      let sourceValue = data[commonField];
      if (!sourceValue) {
        for (const variant of variants) {
          if (data[variant]) {
            sourceValue = data[variant];
            break;
          }
        }
      }

      // Map to target field
      if (sourceValue) {
        const targetField = targetFormat.fields.find(f => 
          f.name === commonField || variants.includes(f.name)
        );
        if (targetField) {
          mapped[targetField.name] = sourceValue;
        }
      }
    }

    return mapped;
  }

  // === HELPER METHODS ===
  private async getBankFormat(formatId: string): Promise<BankFormat | null> {
    const formats = await this.getBankFormats();
    return formats.find(f => f.id === formatId) || null;
  }

  async getSupportedCountries(): Promise<string[]> {
    try {
      const formats = await this.getBankFormats();
      return [...new Set(formats.map(f => f.country))];
    } catch (error) {
      this.logger.error('Failed to get supported countries:', error);
      return [];
    }
  }

  async getFormatsByCountry(country: string): Promise<BankFormat[]> {
    try {
      const formats = await this.getBankFormats();
      return formats.filter(f => f.country === country || f.country === 'INTERNATIONAL');
    } catch (error) {
      this.logger.error('Failed to get formats by country:', error);
      return [];
    }
  }

  async getFormatStatistics(): Promise<any> {
    try {
      const formats = await this.getBankFormats();
      
      return {
        totalFormats: formats.length,
        activeFormats: formats.filter(f => f.active).length,
        byType: formats.reduce((acc, f) => {
          acc[f.formatType] = (acc[f.formatType] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number }),
        byCountry: formats.reduce((acc, f) => {
          acc[f.country] = (acc[f.country] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number })
      };
    } catch (error) {
      this.logger.error('Failed to get format statistics:', error);
      return {
        totalFormats: 0,
        activeFormats: 0,
        byType: {},
        byCountry: {}
      };
    }
  }
}