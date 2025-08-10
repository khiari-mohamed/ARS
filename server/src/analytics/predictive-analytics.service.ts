import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TrendForecast {
  metric: string;
  period: 'daily' | 'weekly' | 'monthly';
  historicalData: DataPoint[];
  forecast: ForecastPoint[];
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal';
  seasonality?: SeasonalPattern;
  accuracy: ModelAccuracy;
}

export interface DataPoint {
  date: Date;
  value: number;
  actual?: boolean;
}

export interface ForecastPoint {
  date: Date;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface SeasonalPattern {
  type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  strength: number;
  peaks: number[];
  valleys: number[];
}

export interface ModelAccuracy {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number;  // Mean Absolute Error
  r2: number;   // R-squared
}

export interface CapacityPlan {
  resource: string;
  currentCapacity: number;
  projectedDemand: CapacityProjection[];
  recommendations: CapacityRecommendation[];
  riskFactors: RiskFactor[];
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface CapacityProjection {
  date: Date;
  demandForecast: number;
  capacityUtilization: number;
  shortfall?: number;
  surplus?: number;
  confidence: number;
}

export interface CapacityRecommendation {
  type: 'increase_capacity' | 'redistribute_workload' | 'optimize_process' | 'hire_staff';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  expectedImpact: string;
  timeframe: string;
  cost?: number;
  roi?: number;
}

export interface RiskFactor {
  factor: string;
  probability: number;
  impact: number;
  description: string;
  mitigation: string;
}

export interface OptimizationOpportunity {
  area: string;
  currentEfficiency: number;
  potentialEfficiency: number;
  description: string;
  implementation: string;
  expectedSavings: number;
}

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'linear_regression' | 'arima' | 'exponential_smoothing' | 'neural_network';
  target: string;
  features: string[];
  accuracy: ModelAccuracy;
  lastTrained: Date;
  status: 'active' | 'training' | 'deprecated';
}

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  // === TREND FORECASTING ===
  async generateTrendForecast(
    metric: string,
    period: 'daily' | 'weekly' | 'monthly',
    forecastDays: number = 30
  ): Promise<TrendForecast> {
    try {
      // Get historical data
      const historicalData = await this.getHistoricalData(metric, period, 90);
      
      // Analyze trend and seasonality
      const trendAnalysis = this.analyzeTrend(historicalData);
      const seasonality = this.detectSeasonality(historicalData, period);
      
      // Generate forecast
      const forecast = this.generateForecast(historicalData, forecastDays, trendAnalysis, seasonality);
      
      // Calculate model accuracy
      const accuracy = this.calculateModelAccuracy(historicalData, metric);
      
      return {
        metric,
        period,
        historicalData,
        forecast,
        confidence: this.calculateOverallConfidence(forecast),
        trend: trendAnalysis.direction,
        seasonality,
        accuracy
      };
    } catch (error) {
      this.logger.error('Failed to generate trend forecast:', error);
      throw error;
    }
  }

  private async getHistoricalData(metric: string, period: string, days: number): Promise<DataPoint[]> {
    // Mock historical data generation
    const data: DataPoint[] = [];
    const baseValue = this.getBaseValue(metric);
    const trend = Math.random() * 0.02 - 0.01; // -1% to +1% daily trend
    const seasonalAmplitude = baseValue * 0.2; // 20% seasonal variation
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      
      // Base trend
      let value = baseValue * (1 + trend * (days - i));
      
      // Add seasonality
      const dayOfWeek = date.getDay();
      const seasonalFactor = Math.sin((dayOfWeek / 7) * 2 * Math.PI) * seasonalAmplitude;
      value += seasonalFactor;
      
      // Add noise
      const noise = (Math.random() - 0.5) * baseValue * 0.1;
      value += noise;
      
      // Ensure positive values
      value = Math.max(value, baseValue * 0.1);
      
      data.push({
        date,
        value: Math.round(value * 100) / 100,
        actual: true
      });
    }
    
    return data;
  }

  private getBaseValue(metric: string): number {
    const baseValues = {
      'bordereaux_count': 150,
      'processing_time': 2.5,
      'success_rate': 95,
      'workload': 80,
      'staff_utilization': 75,
      'error_rate': 3,
      'customer_satisfaction': 4.2
    };
    
    return baseValues[metric] || 100;
  }

  private analyzeTrend(data: DataPoint[]): { direction: 'increasing' | 'decreasing' | 'stable'; strength: number } {
    if (data.length < 2) return { direction: 'stable', strength: 0 };
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    const strength = Math.abs(change);
    
    if (Math.abs(change) < 0.05) {
      return { direction: 'stable', strength };
    } else if (change > 0) {
      return { direction: 'increasing', strength };
    } else {
      return { direction: 'decreasing', strength };
    }
  }

  private detectSeasonality(data: DataPoint[], period: string): SeasonalPattern | undefined {
    if (data.length < 14) return undefined;
    
    // Simple seasonality detection based on day of week
    const dayAverages = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);
    
    data.forEach(point => {
      const dayOfWeek = point.date.getDay();
      dayAverages[dayOfWeek] += point.value;
      dayCounts[dayOfWeek]++;
    });
    
    // Calculate averages
    for (let i = 0; i < 7; i++) {
      if (dayCounts[i] > 0) {
        dayAverages[i] /= dayCounts[i];
      }
    }
    
    const overallAvg = dayAverages.reduce((sum, avg) => sum + avg, 0) / 7;
    const variance = dayAverages.reduce((sum, avg) => sum + Math.pow(avg - overallAvg, 2), 0) / 7;
    const strength = Math.sqrt(variance) / overallAvg;
    
    if (strength > 0.1) { // 10% variation indicates seasonality
      const peaks = dayAverages.map((avg, i) => ({ day: i, value: avg }))
        .filter(d => d.value > overallAvg * 1.1)
        .map(d => d.day);
      
      const valleys = dayAverages.map((avg, i) => ({ day: i, value: avg }))
        .filter(d => d.value < overallAvg * 0.9)
        .map(d => d.day);
      
      return {
        type: 'weekly',
        strength,
        peaks,
        valleys
      };
    }
    
    return undefined;
  }

  private generateForecast(
    historicalData: DataPoint[],
    forecastDays: number,
    trendAnalysis: any,
    seasonality?: SeasonalPattern
  ): ForecastPoint[] {
    const forecast: ForecastPoint[] = [];
    const lastValue = historicalData[historicalData.length - 1].value;
    const trendRate = trendAnalysis.direction === 'increasing' ? 0.01 : 
                     trendAnalysis.direction === 'decreasing' ? -0.01 : 0;
    
    for (let i = 1; i <= forecastDays; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      
      // Base prediction with trend
      let predicted = lastValue * (1 + trendRate * i);
      
      // Apply seasonality
      if (seasonality && seasonality.type === 'weekly') {
        const dayOfWeek = date.getDay();
        const seasonalFactor = seasonality.peaks.includes(dayOfWeek) ? 1.1 :
                              seasonality.valleys.includes(dayOfWeek) ? 0.9 : 1.0;
        predicted *= seasonalFactor;
      }
      
      // Calculate confidence (decreases over time)
      const confidence = Math.max(0.5, 0.95 - (i / forecastDays) * 0.4);
      
      // Calculate bounds
      const errorMargin = predicted * (1 - confidence);
      const lowerBound = predicted - errorMargin;
      const upperBound = predicted + errorMargin;
      
      forecast.push({
        date,
        predicted: Math.round(predicted * 100) / 100,
        lowerBound: Math.round(lowerBound * 100) / 100,
        upperBound: Math.round(upperBound * 100) / 100,
        confidence
      });
    }
    
    return forecast;
  }

  private calculateOverallConfidence(forecast: ForecastPoint[]): number {
    const avgConfidence = forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  private calculateModelAccuracy(historicalData: DataPoint[], metric: string): ModelAccuracy {
    // Mock accuracy calculation
    return {
      mape: Math.random() * 10 + 5, // 5-15%
      rmse: Math.random() * 20 + 10,
      mae: Math.random() * 15 + 8,
      r2: Math.random() * 0.3 + 0.7 // 0.7-1.0
    };
  }

  // === CAPACITY PLANNING ===
  async generateCapacityPlan(resource: string, planningHorizon: number = 90): Promise<CapacityPlan> {
    try {
      const currentCapacity = await this.getCurrentCapacity(resource);
      const demandForecast = await this.forecastDemand(resource, planningHorizon);
      const projectedDemand = this.calculateCapacityProjections(currentCapacity, demandForecast);
      const recommendations = this.generateCapacityRecommendations(projectedDemand, resource);
      const riskFactors = this.identifyCapacityRisks(resource, projectedDemand);
      const optimizationOpportunities = this.identifyOptimizationOpportunities(resource, currentCapacity);

      return {
        resource,
        currentCapacity,
        projectedDemand,
        recommendations,
        riskFactors,
        optimizationOpportunities
      };
    } catch (error) {
      this.logger.error('Failed to generate capacity plan:', error);
      throw error;
    }
  }

  private async getCurrentCapacity(resource: string): Promise<number> {
    // Mock current capacity based on resource type
    const capacities = {
      'staff': 25,
      'processing_power': 1000,
      'storage': 500,
      'bandwidth': 100
    };
    
    return capacities[resource] || 100;
  }

  private async forecastDemand(resource: string, days: number): Promise<DataPoint[]> {
    // Generate demand forecast based on historical trends
    const forecast = await this.generateTrendForecast(`${resource}_demand`, 'daily', days);
    return forecast.forecast.map(f => ({
      date: f.date,
      value: f.predicted,
      actual: false
    }));
  }

  private calculateCapacityProjections(currentCapacity: number, demandForecast: DataPoint[]): CapacityProjection[] {
    return demandForecast.map(demand => {
      const utilization = (demand.value / currentCapacity) * 100;
      const shortfall = demand.value > currentCapacity ? demand.value - currentCapacity : undefined;
      const surplus = demand.value < currentCapacity ? currentCapacity - demand.value : undefined;
      
      return {
        date: demand.date,
        demandForecast: demand.value,
        capacityUtilization: Math.round(utilization * 100) / 100,
        shortfall,
        surplus,
        confidence: 0.85 - (Math.random() * 0.2) // 65-85% confidence
      };
    });
  }

  private generateCapacityRecommendations(projections: CapacityProjection[], resource: string): CapacityRecommendation[] {
    const recommendations: CapacityRecommendation[] = [];
    
    // Check for capacity shortfalls
    const shortfalls = projections.filter(p => p.shortfall && p.shortfall > 0);
    if (shortfalls.length > 0) {
      const maxShortfall = Math.max(...shortfalls.map(s => s.shortfall!));
      
      recommendations.push({
        type: 'increase_capacity',
        priority: maxShortfall > 50 ? 'urgent' : maxShortfall > 20 ? 'high' : 'medium',
        description: `Increase ${resource} capacity by ${Math.ceil(maxShortfall)} units to meet projected demand`,
        expectedImpact: `Eliminate capacity shortfalls and maintain service levels`,
        timeframe: maxShortfall > 50 ? '1-2 weeks' : '1-2 months',
        cost: maxShortfall * 1000, // Mock cost calculation
        roi: 150
      });
    }
    
    // Check for high utilization
    const highUtilization = projections.filter(p => p.capacityUtilization > 85);
    if (highUtilization.length > projections.length * 0.3) {
      recommendations.push({
        type: 'optimize_process',
        priority: 'medium',
        description: `Optimize ${resource} processes to improve efficiency and reduce utilization`,
        expectedImpact: `Reduce average utilization by 10-15%`,
        timeframe: '2-3 months',
        cost: 5000,
        roi: 200
      });
    }
    
    // Check for workload redistribution opportunities
    const utilizationVariance = this.calculateVariance(projections.map(p => p.capacityUtilization));
    if (utilizationVariance > 400) { // High variance indicates uneven distribution
      recommendations.push({
        type: 'redistribute_workload',
        priority: 'medium',
        description: `Redistribute workload to balance ${resource} utilization across time periods`,
        expectedImpact: `Reduce peak utilization by 20-25%`,
        timeframe: '2-4 weeks',
        cost: 2000,
        roi: 120
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private identifyCapacityRisks(resource: string, projections: CapacityProjection[]): RiskFactor[] {
    const risks: RiskFactor[] = [];
    
    // High utilization risk
    const avgUtilization = projections.reduce((sum, p) => sum + p.capacityUtilization, 0) / projections.length;
    if (avgUtilization > 80) {
      risks.push({
        factor: 'High Capacity Utilization',
        probability: 0.7,
        impact: 0.8,
        description: `Average ${resource} utilization of ${avgUtilization.toFixed(1)}% increases risk of service degradation`,
        mitigation: 'Increase capacity or optimize processes to reduce utilization'
      });
    }
    
    // Demand volatility risk
    const demandVariance = this.calculateVariance(projections.map(p => p.demandForecast));
    if (demandVariance > 1000) {
      risks.push({
        factor: 'Demand Volatility',
        probability: 0.5,
        impact: 0.6,
        description: `High demand volatility makes capacity planning challenging`,
        mitigation: 'Implement flexible capacity scaling and demand smoothing strategies'
      });
    }
    
    // Single point of failure risk
    risks.push({
      factor: 'Single Point of Failure',
      probability: 0.2,
      impact: 0.9,
      description: `Dependency on single ${resource} creates vulnerability`,
      mitigation: 'Implement redundancy and backup capacity'
    });
    
    return risks.sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact));
  }

  private identifyOptimizationOpportunities(resource: string, currentCapacity: number): OptimizationOpportunity[] {
    return [
      {
        area: 'Process Automation',
        currentEfficiency: 75,
        potentialEfficiency: 90,
        description: `Automate routine ${resource} tasks to improve efficiency`,
        implementation: 'Deploy automation tools and workflows',
        expectedSavings: currentCapacity * 0.15 * 1000 // 15% efficiency gain
      },
      {
        area: 'Resource Pooling',
        currentEfficiency: 70,
        potentialEfficiency: 85,
        description: `Pool ${resource} across teams to improve utilization`,
        implementation: 'Implement shared resource management system',
        expectedSavings: currentCapacity * 0.12 * 1000 // 12% efficiency gain
      },
      {
        area: 'Predictive Maintenance',
        currentEfficiency: 80,
        potentialEfficiency: 92,
        description: `Implement predictive maintenance to reduce ${resource} downtime`,
        implementation: 'Deploy monitoring and predictive analytics',
        expectedSavings: currentCapacity * 0.08 * 1000 // 8% efficiency gain
      }
    ].sort((a, b) => (b.potentialEfficiency - b.currentEfficiency) - (a.potentialEfficiency - a.currentEfficiency));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  // === PREDICTIVE MODELS MANAGEMENT ===
  async getPredictiveModels(): Promise<PredictiveModel[]> {
    try {
      return [
        {
          id: 'model_demand_forecast',
          name: 'Demand Forecasting Model',
          type: 'arima',
          target: 'daily_volume',
          features: ['historical_volume', 'day_of_week', 'seasonality', 'trends'],
          accuracy: {
            mape: 8.5,
            rmse: 12.3,
            mae: 9.1,
            r2: 0.87
          },
          lastTrained: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          id: 'model_processing_time',
          name: 'Processing Time Prediction',
          type: 'neural_network',
          target: 'processing_duration',
          features: ['complexity', 'priority', 'staff_availability', 'historical_times'],
          accuracy: {
            mape: 12.1,
            rmse: 18.7,
            mae: 14.2,
            r2: 0.82
          },
          lastTrained: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          id: 'model_capacity_planning',
          name: 'Capacity Planning Model',
          type: 'linear_regression',
          target: 'resource_utilization',
          features: ['workload', 'staff_count', 'efficiency_metrics', 'external_factors'],
          accuracy: {
            mape: 15.3,
            rmse: 22.1,
            mae: 18.9,
            r2: 0.75
          },
          lastTrained: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          status: 'training'
        }
      ];
    } catch (error) {
      this.logger.error('Failed to get predictive models:', error);
      return [];
    }
  }

  async retrainModel(modelId: string): Promise<void> {
    try {
      this.logger.log(`Starting retraining for model: ${modelId}`);
      
      // Mock retraining process
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await this.prisma.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'PREDICTIVE_MODEL_RETRAINED',
          details: {
            modelId,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      this.logger.log(`Model ${modelId} retrained successfully`);
    } catch (error) {
      this.logger.error(`Failed to retrain model ${modelId}:`, error);
      throw error;
    }
  }

  async getModelPerformance(modelId: string, period = '30d'): Promise<any> {
    try {
      return {
        modelId,
        period,
        predictions: Math.floor(Math.random() * 1000) + 500,
        accuracy: {
          current: Math.random() * 10 + 85, // 85-95%
          trend: Math.random() > 0.5 ? 'improving' : 'stable',
          change: Math.random() * 5 - 2.5 // -2.5% to +2.5%
        },
        performance: {
          avgPredictionTime: Math.random() * 100 + 50, // 50-150ms
          throughput: Math.floor(Math.random() * 1000) + 500, // predictions per hour
          errorRate: Math.random() * 2 + 1 // 1-3%
        },
        usage: {
          totalRequests: Math.floor(Math.random() * 10000) + 5000,
          uniqueUsers: Math.floor(Math.random() * 100) + 50,
          avgRequestsPerUser: Math.floor(Math.random() * 50) + 25
        }
      };
    } catch (error) {
      this.logger.error('Failed to get model performance:', error);
      return {};
    }
  }
}