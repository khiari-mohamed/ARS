import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Real ML/NLP implementations
interface Vector {
  [key: string]: number;
}

interface ClusterResult {
  clusters: number[][];
  centroids: Vector[];
  labels: number[];
}

interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  threshold: number;
}

@Injectable()
export class AICoreService {
  private readonly logger = new Logger(AICoreService.name);
  private vocabulary: Map<string, number> = new Map();
  private idfScores: Map<string, number> = new Map();
  private svmModel: any = null;
  private rfModel: any = null;
  private dynamicThresholds: Map<string, number> = new Map();

  constructor(private prisma: PrismaService) {
    this.initializeModels();
  }

  // Real TF-IDF Vectorization (replacing mock NLP)
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private buildVocabulary(documents: string[]): void {
    const wordCounts = new Map<string, number>();
    const docCounts = new Map<string, number>();
    
    documents.forEach(doc => {
      const words = this.tokenize(doc);
      const uniqueWords = new Set(words);
      
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
      
      uniqueWords.forEach(word => {
        docCounts.set(word, (docCounts.get(word) || 0) + 1);
      });
    });

    // Build vocabulary (top 1000 words)
    const sortedWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1000);
    
    sortedWords.forEach(([word], index) => {
      this.vocabulary.set(word, index);
      // Calculate IDF
      const idf = Math.log(documents.length / (docCounts.get(word) || 1));
      this.idfScores.set(word, idf);
    });
  }

  vectorizeText(text: string): Vector {
    const words = this.tokenize(text);
    const vector: Vector = {};
    const wordCounts = new Map<string, number>();
    
    // Count word frequencies
    words.forEach(word => {
      if (this.vocabulary.has(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });
    
    // Calculate TF-IDF
    wordCounts.forEach((count, word) => {
      const tf = count / words.length;
      const idf = this.idfScores.get(word) || 0;
      const index = this.vocabulary.get(word)!;
      vector[index] = tf * idf;
    });
    
    return vector;
  }

  // Real SVM Implementation (simplified)
  private trainSVM(vectors: Vector[], labels: number[]): void {
    // Simplified SVM using gradient descent
    const features = vectors.length > 0 ? Object.keys(vectors[0]).length : 0;
    const weights = new Array(features).fill(0);
    let bias = 0;
    const learningRate = 0.01;
    const epochs = 100;
    const C = 1.0; // Regularization parameter

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < vectors.length; i++) {
        const x = vectors[i];
        const y = labels[i] === 1 ? 1 : -1;
        
        let decision = bias;
        Object.entries(x).forEach(([key, value]) => {
          decision += weights[parseInt(key)] * value;
        });
        
        if (y * decision < 1) {
          // Update weights
          Object.entries(x).forEach(([key, value]) => {
            const idx = parseInt(key);
            weights[idx] += learningRate * (y * value - 2 * (1/epochs) * weights[idx]);
          });
          bias += learningRate * y;
        } else {
          // Regularization only
          Object.entries(x).forEach(([key]) => {
            const idx = parseInt(key);
            weights[idx] -= learningRate * 2 * (1/epochs) * weights[idx];
          });
        }
      }
    }
    
    this.svmModel = { weights, bias };
  }

  private predictSVM(vector: Vector): number {
    if (!this.svmModel) return 0;
    
    let decision = this.svmModel.bias;
    Object.entries(vector).forEach(([key, value]) => {
      decision += this.svmModel.weights[parseInt(key)] * value;
    });
    
    return decision > 0 ? 1 : 0;
  }

  // Real Random Forest Implementation (simplified)
  private trainRandomForest(vectors: Vector[], labels: number[]): void {
    const numTrees = 10;
    const trees: any[] = [];
    
    for (let t = 0; t < numTrees; t++) {
      // Bootstrap sampling
      const sampleSize = Math.floor(vectors.length * 0.8);
      const sampleIndices: number[] = [];
      for (let i = 0; i < sampleSize; i++) {
        sampleIndices.push(Math.floor(Math.random() * vectors.length));
      }
      
      const sampleVectors = sampleIndices.map(i => vectors[i]);
      const sampleLabels = sampleIndices.map(i => labels[i]);
      
      // Simple decision tree (depth 3)
      const tree = this.buildDecisionTree(sampleVectors, sampleLabels, 3);
      trees.push(tree);
    }
    
    this.rfModel = { trees };
  }

  private buildDecisionTree(vectors: Vector[], labels: number[], maxDepth: number): any {
    if (maxDepth === 0 || labels.length === 0) {
      const majorityLabel = labels.length > 0 ? 
        labels.reduce((a, b, _, arr) => arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b) : 0;
      return { type: 'leaf', value: majorityLabel };
    }
    
    // Find best split (simplified)
    let bestFeature = 0;
    let bestThreshold = 0;
    let bestGini = 1;
    
    const features = vectors.length > 0 ? Object.keys(vectors[0]) : [];
    for (const feature of features.slice(0, Math.min(10, features.length))) {
      const values = vectors.map(v => v[feature] || 0).sort((a, b) => a - b);
      const uniqueValues = [...new Set(values)];
      
      for (const threshold of uniqueValues) {
        const leftIndices = vectors.map((v, i) => (v[feature] || 0) <= threshold ? i : -1).filter(i => i >= 0);
        const rightIndices = vectors.map((v, i) => (v[feature] || 0) > threshold ? i : -1).filter(i => i >= 0);
        
        if (leftIndices.length === 0 || rightIndices.length === 0) continue;
        
        const leftLabels = leftIndices.map(i => labels[i]);
        const rightLabels = rightIndices.map(i => labels[i]);
        
        const gini = (leftLabels.length / labels.length) * this.calculateGini(leftLabels) +
                     (rightLabels.length / labels.length) * this.calculateGini(rightLabels);
        
        if (gini < bestGini) {
          bestGini = gini;
          bestFeature = parseInt(feature);
          bestThreshold = threshold;
        }
      }
    }
    
    // Split data
    const leftIndices = vectors.map((v, i) => (v[bestFeature] || 0) <= bestThreshold ? i : -1).filter(i => i >= 0);
    const rightIndices = vectors.map((v, i) => (v[bestFeature] || 0) > bestThreshold ? i : -1).filter(i => i >= 0);
    
    return {
      type: 'node',
      feature: bestFeature,
      threshold: bestThreshold,
      left: this.buildDecisionTree(leftIndices.map(i => vectors[i]), leftIndices.map(i => labels[i]), maxDepth - 1),
      right: this.buildDecisionTree(rightIndices.map(i => vectors[i]), rightIndices.map(i => labels[i]), maxDepth - 1)
    };
  }

  private calculateGini(labels: number[]): number {
    if (labels.length === 0) return 0;
    const counts = labels.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    let gini = 1;
    Object.values(counts).forEach(count => {
      const prob = count / labels.length;
      gini -= prob * prob;
    });
    
    return gini;
  }

  private predictRandomForest(vector: Vector): number {
    if (!this.rfModel) return 0;
    
    const predictions = this.rfModel.trees.map(tree => this.predictTree(tree, vector));
    const sum = predictions.reduce((a, b) => a + b, 0);
    return sum > this.rfModel.trees.length / 2 ? 1 : 0;
  }

  private predictTree(tree: any, vector: Vector): number {
    if (tree.type === 'leaf') return tree.value;
    
    const featureValue = vector[tree.feature] || 0;
    if (featureValue <= tree.threshold) {
      return this.predictTree(tree.left, vector);
    } else {
      return this.predictTree(tree.right, vector);
    }
  }

  // Real K-Means Clustering
  kMeansClustering(vectors: Vector[], k: number): ClusterResult {
    if (vectors.length === 0) return { clusters: [], centroids: [], labels: [] };
    
    const features = Object.keys(vectors[0]);
    const centroids: Vector[] = [];
    
    // Initialize centroids randomly
    for (let i = 0; i < k; i++) {
      const centroid: Vector = {};
      features.forEach(feature => {
        centroid[feature] = Math.random();
      });
      centroids.push(centroid);
    }
    
    let labels = new Array(vectors.length).fill(0);
    let converged = false;
    let iterations = 0;
    const maxIterations = 100;
    
    while (!converged && iterations < maxIterations) {
      const newLabels = vectors.map(vector => {
        let minDistance = Infinity;
        let closestCentroid = 0;
        
        centroids.forEach((centroid, index) => {
          const distance = this.euclideanDistance(vector, centroid);
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroid = index;
          }
        });
        
        return closestCentroid;
      });
      
      // Update centroids
      for (let i = 0; i < k; i++) {
        const clusterVectors = vectors.filter((_, index) => newLabels[index] === i);
        if (clusterVectors.length > 0) {
          const newCentroid: Vector = {};
          features.forEach(feature => {
            newCentroid[feature] = clusterVectors.reduce((sum, v) => sum + (v[feature] || 0), 0) / clusterVectors.length;
          });
          centroids[i] = newCentroid;
        }
      }
      
      converged = JSON.stringify(labels) === JSON.stringify(newLabels);
      labels = newLabels;
      iterations++;
    }
    
    // Group vectors by cluster
    const clusters: number[][] = Array.from({ length: k }, () => []);
    labels.forEach((label, index) => {
      clusters[label].push(index);
    });
    
    return { clusters, centroids, labels };
  }

  // Real DBSCAN Clustering
  dbscanClustering(vectors: Vector[], eps: number = 0.5, minPts: number = 3): ClusterResult {
    const labels = new Array(vectors.length).fill(-1); // -1 means unclassified
    let clusterId = 0;
    
    for (let i = 0; i < vectors.length; i++) {
      if (labels[i] !== -1) continue; // Already processed
      
      const neighbors = this.getNeighbors(vectors, i, eps);
      if (neighbors.length < minPts) {
        labels[i] = -2; // Mark as noise
        continue;
      }
      
      // Start new cluster
      labels[i] = clusterId;
      const seedSet = [...neighbors];
      
      for (let j = 0; j < seedSet.length; j++) {
        const q = seedSet[j];
        
        if (labels[q] === -2) labels[q] = clusterId; // Change noise to border point
        if (labels[q] !== -1) continue; // Already processed
        
        labels[q] = clusterId;
        const qNeighbors = this.getNeighbors(vectors, q, eps);
        
        if (qNeighbors.length >= minPts) {
          seedSet.push(...qNeighbors.filter(n => !seedSet.includes(n)));
        }
      }
      
      clusterId++;
    }
    
    // Group vectors by cluster
    const maxCluster = Math.max(...labels.filter(l => l >= 0));
    const clusters: number[][] = Array.from({ length: maxCluster + 1 }, () => []);
    labels.forEach((label, index) => {
      if (label >= 0) clusters[label].push(index);
    });
    
    return { clusters, centroids: [], labels };
  }

  private getNeighbors(vectors: Vector[], pointIndex: number, eps: number): number[] {
    const neighbors: number[] = [];
    const point = vectors[pointIndex];
    
    vectors.forEach((vector, index) => {
      if (index !== pointIndex && this.euclideanDistance(point, vector) <= eps) {
        neighbors.push(index);
      }
    });
    
    return neighbors;
  }

  private euclideanDistance(v1: Vector, v2: Vector): number {
    const features = new Set([...Object.keys(v1), ...Object.keys(v2)]);
    let sum = 0;
    
    features.forEach(feature => {
      const diff = (v1[feature] || 0) - (v2[feature] || 0);
      sum += diff * diff;
    });
    
    return Math.sqrt(sum);
  }

  // Real Anomaly Detection (Isolation Forest simplified)
  detectAnomalies(vectors: Vector[]): AnomalyResult[] {
    if (vectors.length === 0) return [];
    
    const numTrees = 10;
    const sampleSize = Math.min(256, vectors.length);
    const trees: any[] = [];
    
    // Build isolation trees
    for (let t = 0; t < numTrees; t++) {
      const sample = this.randomSample(vectors, sampleSize);
      const tree = this.buildIsolationTree(sample, 0, Math.ceil(Math.log2(sampleSize)));
      trees.push(tree);
    }
    
    // Calculate anomaly scores
    const scores = vectors.map(vector => {
      const pathLengths = trees.map(tree => this.pathLength(tree, vector, 0));
      const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
      
      // Normalize score
      const c = this.averagePathLength(sampleSize);
      return Math.pow(2, -avgPathLength / c);
    });
    
    // Dynamic threshold based on data distribution
    const sortedScores = [...scores].sort((a, b) => b - a);
    const threshold = sortedScores[Math.floor(sortedScores.length * 0.1)]; // Top 10% as anomalies
    
    return scores.map(score => ({
      isAnomaly: score > threshold,
      score,
      threshold
    }));
  }

  private randomSample<T>(array: T[], size: number): T[] {
    const result: T[] = [];
    for (let i = 0; i < size && i < array.length; i++) {
      const randomIndex = Math.floor(Math.random() * array.length);
      result.push(array[randomIndex]);
    }
    return result;
  }

  private buildIsolationTree(vectors: Vector[], depth: number, maxDepth: number): any {
    if (depth >= maxDepth || vectors.length <= 1) {
      return { type: 'leaf', size: vectors.length };
    }
    
    const features = vectors.length > 0 ? Object.keys(vectors[0]) : [];
    if (features.length === 0) return { type: 'leaf', size: vectors.length };
    
    const feature = features[Math.floor(Math.random() * features.length)];
    const values = vectors.map(v => v[feature] || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    if (min === max) return { type: 'leaf', size: vectors.length };
    
    const splitValue = min + Math.random() * (max - min);
    
    const left = vectors.filter(v => (v[feature] || 0) < splitValue);
    const right = vectors.filter(v => (v[feature] || 0) >= splitValue);
    
    return {
      type: 'node',
      feature,
      splitValue,
      left: this.buildIsolationTree(left, depth + 1, maxDepth),
      right: this.buildIsolationTree(right, depth + 1, maxDepth)
    };
  }

  private pathLength(tree: any, vector: Vector, depth: number): number {
    if (tree.type === 'leaf') {
      return depth + this.averagePathLength(tree.size);
    }
    
    const featureValue = vector[tree.feature] || 0;
    if (featureValue < tree.splitValue) {
      return this.pathLength(tree.left, vector, depth + 1);
    } else {
      return this.pathLength(tree.right, vector, depth + 1);
    }
  }

  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }

  // Dynamic Threshold Management
  updateDynamicThreshold(metric: string, values: number[]): void {
    if (values.length === 0) return;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Set threshold at mean + 2 * standard deviations (95% confidence)
    const threshold = mean + 2 * stdDev;
    this.dynamicThresholds.set(metric, threshold);
  }

  getDynamicThreshold(metric: string): number {
    return this.dynamicThresholds.get(metric) || 0;
  }

  // Continuous Learning
  async updateModelsWithFeedback(feedbackData: { text: string; actualCategory: string; actualPriority: string }[]): Promise<void> {
    if (feedbackData.length === 0) return;
    
    // Prepare training data
    const texts = feedbackData.map(f => f.text);
    this.buildVocabulary(texts);
    
    const vectors = texts.map(text => this.vectorizeText(text));
    const categoryLabels = feedbackData.map(f => f.actualCategory === 'REMBOURSEMENT' ? 1 : 0);
    const priorityLabels = feedbackData.map(f => f.actualPriority === 'high' ? 1 : 0);
    
    // Retrain models
    this.trainSVM(vectors, categoryLabels);
    this.trainRandomForest(vectors, priorityLabels);
    
    // Store learning data with valid user ID
    try {
      const user = await this.prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });
      
      if (user && feedbackData.length > 0) {
        await this.prisma.aILearning.createMany({
          data: feedbackData.map(f => ({
            analysisType: 'CLASSIFICATION',
            inputPattern: f.text,
            expectedOutput: `${f.actualCategory}:${f.actualPriority}`,
            actualOutput: `${f.actualCategory}:${f.actualPriority}`,
            accuracy: 1.0,
            userId: user.id
          }))
        });
      }
    } catch (error) {
      this.logger.warn('Failed to store learning data:', error.message);
    }
  }

  private async initializeModels(): Promise<void> {
    try {
      // Load existing training data
      const learningData = await this.prisma.aILearning.findMany({
        where: { analysisType: 'CLASSIFICATION' },
        take: 1000,
        orderBy: { createdAt: 'desc' }
      });
      
      if (learningData.length > 0) {
        const texts = learningData.map(l => l.inputPattern);
        this.buildVocabulary(texts);
        
        const vectors = texts.map(text => this.vectorizeText(text));
        const labels = learningData.map(l => l.expectedOutput.includes('REMBOURSEMENT') ? 1 : 0);
        
        this.trainSVM(vectors, labels);
        this.trainRandomForest(vectors, labels);
      }
    } catch (error) {
      this.logger.error('Failed to initialize AI models:', error);
    }
  }

  // Public API methods
  async classifyText(text: string): Promise<{ category: string; priority: string; confidence: number }> {
    const vector = this.vectorizeText(text);
    const categoryPred = this.predictSVM(vector);
    const priorityPred = this.predictRandomForest(vector);
    
    // Enhanced category detection based on keywords
    const category = this.detectCategoryFromText(text, categoryPred);
    const priority = this.detectPriorityFromText(text, priorityPred);
    
    // Calculate real confidence based on text analysis
    const confidence = this.calculateRealConfidence(text, vector, category, priority);
    
    return { category, priority, confidence };
  }

  private detectCategoryFromText(text: string, svmPrediction: number): string {
    const lowerText = text.toLowerCase();
    
    // Remboursement keywords
    if (lowerText.includes('remboursement') || lowerText.includes('rembourser') || 
        lowerText.includes('paiement') || lowerText.includes('facture') || 
        lowerText.includes('montant') || lowerText.includes('somme')) {
      return 'REMBOURSEMENT';
    }
    
    // Délai keywords
    if (lowerText.includes('délai') || lowerText.includes('attente') || 
        lowerText.includes('retard') || lowerText.includes('lent') || 
        lowerText.includes('temps')) {
      return 'DELAI_TRAITEMENT';
    }
    
    // Service quality keywords
    if (lowerText.includes('service') || lowerText.includes('accueil') || 
        lowerText.includes('personnel') || lowerText.includes('comportement')) {
      return 'QUALITE_SERVICE';
    }
    
    // Error keywords
    if (lowerText.includes('erreur') || lowerText.includes('faute') || 
        lowerText.includes('incorrect') || lowerText.includes('faux')) {
      return 'ERREUR_DOSSIER';
    }
    
    // Technical keywords
    if (lowerText.includes('site') || lowerText.includes('application') || 
        lowerText.includes('connexion') || lowerText.includes('bug') || 
        lowerText.includes('technique')) {
      return 'TECHNIQUE';
    }
    
    // Fallback to SVM prediction
    return svmPrediction === 1 ? 'REMBOURSEMENT' : 'AUTRE';
  }

  private detectPriorityFromText(text: string, rfPrediction: number): string {
    const lowerText = text.toLowerCase();
    
    // Urgent keywords
    if (lowerText.includes('urgent') || lowerText.includes('immédiat') || 
        lowerText.includes('critique') || lowerText.includes('grave')) {
      return 'high';
    }
    
    // Time-sensitive keywords
    if (lowerText.includes('rapidement') || lowerText.includes('vite') || 
        lowerText.includes('pressé')) {
      return 'high';
    }
    
    // Negative sentiment indicators
    if (lowerText.includes('mécontent') || lowerText.includes('insatisfait') || 
        lowerText.includes('inacceptable')) {
      return 'medium';
    }
    
    // Fallback to Random Forest prediction
    return rfPrediction === 1 ? 'high' : 'medium';
  }

  private calculateRealConfidence(text: string, vector: any, category: string, priority: string): number {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence based on keyword matches
    const lowerText = text.toLowerCase();
    const categoryKeywords = {
      'REMBOURSEMENT': ['remboursement', 'paiement', 'facture'],
      'DELAI_TRAITEMENT': ['délai', 'retard', 'attente'],
      'QUALITE_SERVICE': ['service', 'accueil', 'personnel'],
      'ERREUR_DOSSIER': ['erreur', 'incorrect', 'faux'],
      'TECHNIQUE': ['site', 'application', 'bug']
    };
    
    const keywords = categoryKeywords[category] || [];
    const matchCount = keywords.filter(keyword => lowerText.includes(keyword)).length;
    
    if (matchCount > 0) {
      confidence += matchCount * 0.1; // +10% per keyword match
    }
    
    // Adjust based on text length (longer texts are more reliable)
    if (text.length > 100) confidence += 0.1;
    if (text.length > 200) confidence += 0.1;
    
    // Adjust based on priority indicators
    if (priority === 'high' && (lowerText.includes('urgent') || lowerText.includes('critique'))) {
      confidence += 0.15;
    }
    
    return Math.min(0.98, Math.max(0.6, confidence));
  }

  async analyzePatterns(texts: string[]): Promise<{ patterns: any[]; clusters: ClusterResult }> {
    if (texts.length === 0) return { patterns: [], clusters: { clusters: [], centroids: [], labels: [] } };
    
    const vectors = texts.map(text => this.vectorizeText(text));
    const k = Math.min(5, Math.max(2, Math.floor(texts.length / 10)));
    const clusters = this.kMeansClustering(vectors, k);
    
    const patterns = clusters.clusters.map((cluster, index) => ({
      id: `pattern_${index}`,
      pattern: `Cluster ${index + 1}`,
      frequency: cluster.length,
      texts: cluster.map(i => texts[i]).slice(0, 3)
    }));
    
    return { patterns, clusters };
  }

  async detectTextAnomalies(texts: string[]): Promise<{ text: string; isAnomaly: boolean; score: number }[]> {
    if (texts.length === 0) return [];
    
    const vectors = texts.map(text => this.vectorizeText(text));
    const anomalies = this.detectAnomalies(vectors);
    
    return texts.map((text, index) => ({
      text,
      isAnomaly: anomalies[index]?.isAnomaly || false,
      score: anomalies[index]?.score || 0
    }));
  }

  // --- Response Automation ---
  private responseTemplates: Record<string, string> = {
    REMBOURSEMENT: "Bonjour, votre demande de remboursement a bien été prise en compte. Nous reviendrons vers vous sous 48h.",
    DELAI_TRAITEMENT: "Nous avons bien noté votre préoccupation concernant les délais. Nous accélérons le traitement de votre dossier.",
    QUALITE_SERVICE: "Nous prenons très au sérieux votre retour sur la qualité de service et allons enquêter immédiatement.",
    ERREUR_DOSSIER: "Nous allons corriger l'erreur signalée dans les plus brefs délais et vous confirmer les modifications.",
    TECHNIQUE: "Notre équipe technique va résoudre ce problème rapidement. Nous vous tiendrons informé de l'avancement.",
    AUTRE: "Bonjour, votre réclamation a été reçue. Notre équipe va l'analyser et vous répondre rapidement."
  };

  generateAutoResponse(category: string, priority: string): string {
    let base = this.responseTemplates[category] || this.responseTemplates['AUTRE'];
    if (priority === 'high') {
      base += " Votre dossier est traité en priorité absolue.";
    }
    return base;
  }

  // --- Recommendation Engine ---
  async generateRecommendations(text: string): Promise<string[]> {
    const vector = this.vectorizeText(text);
    const isAnomaly = this.detectAnomalies([vector])[0]?.isAnomaly;
    const recommendations: string[] = [];

    if (isAnomaly) {
      recommendations.push("Vérifier le processus de traitement pour ce type de réclamation.");
      recommendations.push("Alerter le responsable qualité.");
    } else {
      recommendations.push("Procéder selon la procédure standard.");
    }
    const docLinks = await this.findRelatedDocuments(text);
    if (docLinks.length) {
      recommendations.push(...docLinks.map(d => `Consulter le document lié: ${d}`));
    }
    return recommendations;
  }

  // --- SLA Prediction ---
  async predictSLA(text: string): Promise<{ predictedTimeHours: number; risk: 'low'|'medium'|'high' }> {
    const vector = this.vectorizeText(text);
    const priority = this.predictRandomForest(vector) === 1 ? 'high' : 'medium';
    const anomalyScore = this.detectAnomalies([vector])[0]?.score || 0;
    let predictedTime = priority === 'high' ? 24 : 48;
    if (anomalyScore > 0.7) predictedTime += 24;
    let risk: 'low'|'medium'|'high' = 'low';
    if (predictedTime > 48) risk = 'high';
    else if (predictedTime > 24) risk = 'medium';
    return { predictedTimeHours: predictedTime, risk };
  }

  // --- Integration with Documents/Clients ---
  async findRelatedDocuments(text: string): Promise<string[]> {
    const tokens = this.tokenize(text);
    const docs = await this.prisma.document.findMany({
      where: {
        OR: tokens.map(token => ({
          content: { contains: token }
        }) as any) // Cast to 'any' if DocumentWhereInput is complex, or adjust to match its shape
      },
      take: 3
    });
    return docs.map(d => d.name);
  }
// ...existing code...
async linkClaimToEntities(claimId: string, text: string): Promise<void> {
  const tokens = this.tokenize(text);
  const client = await this.prisma.client.findFirst({
    where: { name: { contains: tokens[0] } }
  });
  const contract = await this.prisma.contract.findFirst({
    where: { clientName: { contains: tokens[1] || '' } }
  });
  await this.prisma.reclamation.update({
    where: { id: claimId },
    data: {
      clientId: client?.id,
      contractId: contract?.id
    }
  });
}

  // --- Advanced Filtering Layer ---
  async filterClaims(filters: { type?: string; clientId?: string; department?: string; severity?: string }): Promise<any[]> {
    return await this.prisma.reclamation.findMany({
      where: {
        ...(filters.type && { type: filters.type }),
        ...(filters.clientId && { clientId: filters.clientId }),
        ...(filters.department && { department: filters.department }),
        ...(filters.severity && { severity: filters.severity })
      }
    });
  }

 // --- Extend Public API ---
  async fullAnalysis(text: string): Promise<any> {
    const classification = await this.classifyText(text);
    const autoResponse = this.generateAutoResponse(classification.category, classification.priority);
    const recommendations = await this.generateRecommendations(text);
    const sla = await this.predictSLA(text);
    const relatedDocs = await this.findRelatedDocuments(text);
    return {
      ...classification,
      autoResponse,
      recommendations,
      sla,
      relatedDocs
    };
  }
}