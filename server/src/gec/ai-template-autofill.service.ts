import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ContextData {
  bordereauId?: string;
  clientId?: string;
  reclamationId?: string;
  userId?: string;
}

interface AutoFillResult {
  variables: Record<string, string>;
  confidence: number;
  suggestions: Record<string, string[]>;
}

@Injectable()
export class AITemplateAutoFillService {
  private readonly logger = new Logger(AITemplateAutoFillService.name);

  constructor(private prisma: PrismaService) {}

  async autoFillTemplate(templateContent: string, context: ContextData): Promise<AutoFillResult> {
    const variables = this.extractVariables(templateContent);
    const filledVariables: Record<string, string> = {};
    const suggestions: Record<string, string[]> = {};
    let totalConfidence = 0;

    for (const variable of variables) {
      const result = await this.fillVariable(variable, context);
      filledVariables[variable] = result.value;
      suggestions[variable] = result.alternatives;
      totalConfidence += result.confidence;
    }

    return {
      variables: filledVariables,
      confidence: variables.length > 0 ? totalConfidence / variables.length : 0,
      suggestions
    };
  }

  private extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    return matches ? matches.map(m => m.replace(/[{}]/g, '')) : [];
  }

  private async fillVariable(variable: string, context: ContextData): Promise<{
    value: string;
    confidence: number;
    alternatives: string[];
  }> {
    const lowerVar = variable.toLowerCase();
    
    if (lowerVar.includes('client') || lowerVar.includes('nom')) {
      return this.fillClientVariable(variable, context);
    }
    
    if (lowerVar.includes('reference') || lowerVar.includes('bordereau')) {
      return this.fillBordereauVariable(variable, context);
    }
    
    if (lowerVar.includes('date')) {
      return this.fillDateVariable(variable, context);
    }
    
    if (lowerVar.includes('montant') || lowerVar.includes('somme')) {
      return this.fillAmountVariable(variable, context);
    }
    
    if (lowerVar.includes('delai') || lowerVar.includes('sla')) {
      return this.fillDelayVariable(variable, context);
    }

    return {
      value: `[${variable}]`,
      confidence: 0.1,
      alternatives: []
    };
  }

  private async fillClientVariable(variable: string, context: ContextData): Promise<{
    value: string;
    confidence: number;
    alternatives: string[];
  }> {
    try {
      let client: any = null;
      
      if (context.clientId) {
        client = await this.prisma.client.findUnique({
          where: { id: context.clientId }
        });
      } else if (context.bordereauId) {
        const bordereau = await this.prisma.bordereau.findUnique({
          where: { id: context.bordereauId },
          include: { client: true }
        });
        client = bordereau?.client || null;
      } else if (context.reclamationId) {
        const reclamation = await this.prisma.reclamation.findUnique({
          where: { id: context.reclamationId },
          include: { client: true }
        });
        client = reclamation?.client || null;
      }

      if (client) {
        return {
          value: client.name,
          confidence: 0.95,
          alternatives: [client.name, `M./Mme ${client.name}`]
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to fill client variable: ${error.message}`);
    }

    return {
      value: '[Nom du client]',
      confidence: 0.1,
      alternatives: ['Client', 'Monsieur/Madame']
    };
  }

  private async fillBordereauVariable(variable: string, context: ContextData): Promise<{
    value: string;
    confidence: number;
    alternatives: string[];
  }> {
    try {
      let bordereau: any = null;
      
      if (context.bordereauId) {
        bordereau = await this.prisma.bordereau.findUnique({
          where: { id: context.bordereauId }
        });
      } else if (context.reclamationId) {
        const reclamation = await this.prisma.reclamation.findUnique({
          where: { id: context.reclamationId },
          include: { bordereau: true }
        });
        bordereau = reclamation?.bordereau || null;
      }

      if (bordereau) {
        return {
          value: bordereau.reference,
          confidence: 0.98,
          alternatives: [bordereau.reference, `Dossier ${bordereau.reference}`]
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to fill bordereau variable: ${error.message}`);
    }

    return {
      value: '[Référence]',
      confidence: 0.1,
      alternatives: ['REF/2025/001', 'Dossier en cours']
    };
  }

  private async fillDateVariable(variable: string, context: ContextData): Promise<{
    value: string;
    confidence: number;
    alternatives: string[];
  }> {
    const now = new Date();
    const lowerVar = variable.toLowerCase();
    
    if (lowerVar.includes('reception')) {
      try {
        let receptionDate: Date | null = null;
        
        if (context.bordereauId) {
          const bordereau = await this.prisma.bordereau.findUnique({
            where: { id: context.bordereauId }
          });
          receptionDate = bordereau?.dateReception || null;
        }
        
        if (receptionDate) {
          return {
            value: receptionDate.toLocaleDateString('fr-FR'),
            confidence: 0.9,
            alternatives: [
              receptionDate.toLocaleDateString('fr-FR'),
              receptionDate.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            ]
          };
        }
      } catch (error) {
        this.logger.warn(`Failed to get reception date: ${error.message}`);
      }
    }
    
    return {
      value: now.toLocaleDateString('fr-FR'),
      confidence: 0.8,
      alternatives: [
        now.toLocaleDateString('fr-FR'),
        now.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      ]
    };
  }

  private async fillAmountVariable(variable: string, context: ContextData): Promise<{
    value: string;
    confidence: number;
    alternatives: string[];
  }> {
    try {
      if (context.bordereauId) {
        const virement = await this.prisma.virement.findFirst({
          where: { bordereauId: context.bordereauId }
        });
        
        if (virement) {
          const amount = virement.montant.toString();
          return {
            value: `${amount} €`,
            confidence: 0.95,
            alternatives: [
              `${amount} €`,
              `${amount} euros`,
              new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR' 
              }).format(virement.montant)
            ]
          };
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to fill amount variable: ${error.message}`);
    }

    return {
      value: '[Montant]',
      confidence: 0.1,
      alternatives: ['0 €', 'Montant à déterminer']
    };
  }

  private async fillDelayVariable(variable: string, context: ContextData): Promise<{
    value: string;
    confidence: number;
    alternatives: string[];
  }> {
    try {
      let delai = 5;
      
      if (context.clientId) {
        const client = await this.prisma.client.findUnique({
          where: { id: context.clientId }
        });
        delai = client?.reglementDelay || 5;
      } else if (context.bordereauId) {
        const bordereau = await this.prisma.bordereau.findUnique({
          where: { id: context.bordereauId },
          include: { client: true, contract: true }
        });
        delai = bordereau?.contract?.delaiReglement || 
               bordereau?.client?.reglementDelay || 5;
      }

      return {
        value: `${delai} jours`,
        confidence: 0.9,
        alternatives: [
          `${delai} jours`,
          `${delai} jours ouvrés`,
          `sous ${delai} jours`
        ]
      };
    } catch (error) {
      this.logger.warn(`Failed to fill delay variable: ${error.message}`);
    }

    return {
      value: '5 jours',
      confidence: 0.7,
      alternatives: ['5 jours', '5 jours ouvrés', 'sous 5 jours']
    };
  }

  async renderTemplateWithAI(templateContent: string, context: ContextData): Promise<{
    renderedContent: string;
    confidence: number;
    usedVariables: Record<string, string>;
  }> {
    const autoFillResult = await this.autoFillTemplate(templateContent, context);
    
    let renderedContent = templateContent;
    Object.entries(autoFillResult.variables).forEach(([variable, value]) => {
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      renderedContent = renderedContent.replace(regex, value);
    });

    return {
      renderedContent,
      confidence: autoFillResult.confidence,
      usedVariables: autoFillResult.variables
    };
  }
}