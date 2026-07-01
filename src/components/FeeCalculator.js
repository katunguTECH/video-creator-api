// ============================================
// FEE CALCULATION SYSTEM
// ============================================

// Base costs per API/model (in KES - Kenyan Shillings)
const BASE_COSTS = {
  // Replicate models (cost per video)
  replicate_stable_video: {
    baseCost: 5,
    perSecond: 0.5,
    defaultDuration: 5,
    minCost: 5,
    maxCost: 50,
    name: 'Stable Video Diffusion'
  },
  replicate_alternative: {
    baseCost: 3,
    perSecond: 0.3,
    defaultDuration: 5,
    minCost: 3,
    maxCost: 30,
    name: 'Alternative Model'
  },
  // Dreamina models
  dreamina_720p: {
    baseCost: 15,
    perSecond: 1.5,
    defaultDuration: 5,
    minCost: 15,
    maxCost: 100,
    name: 'Dreamina 720p'
  },
  dreamina_1080p: {
    baseCost: 25,
    perSecond: 2.5,
    defaultDuration: 5,
    minCost: 25,
    maxCost: 150,
    name: 'Dreamina 1080p'
  },
  // Translation (per video)
  translation: {
    baseCost: 10,
    perMinute: 5,
    defaultDuration: 1,
    minCost: 10,
    maxCost: 100,
    name: 'Video Translation'
  },
  // Photos to video (per photo)
  photos_to_video: {
    baseCost: 2,
    perPhoto: 1,
    minPhotos: 2,
    maxPhotos: 20,
    minCost: 4,
    maxCost: 30,
    name: 'Photos to Video'
  }
};

// Markup multiplier (10x)
const MARKUP_MULTIPLIER = 10;

class FeeCalculator {
  static calculatePrice(serviceType, options = {}) {
    const config = BASE_COSTS[serviceType];
    if (!config) {
      throw new Error(`Unknown service type: ${serviceType}`);
    }

    let baseCost = 0;
    let breakdown = [];

    switch (serviceType) {
      case 'replicate_stable_video':
      case 'replicate_alternative':
      case 'dreamina_720p':
      case 'dreamina_1080p': {
        const duration = options.duration || config.defaultDuration;
        baseCost = config.baseCost + (config.perSecond * duration);
        baseCost = Math.min(Math.max(baseCost, config.minCost), config.maxCost);
        
        breakdown = [
          { item: 'Base fee', amount: config.baseCost },
          { item: `${duration}s video`, amount: config.perSecond * duration }
        ];
        break;
      }
      
      case 'translation': {
        const duration = options.duration || config.defaultDuration;
        baseCost = config.baseCost + (config.perMinute * duration);
        baseCost = Math.min(Math.max(baseCost, config.minCost), config.maxCost);
        
        breakdown = [
          { item: 'Base translation fee', amount: config.baseCost },
          { item: `${duration} minute(s)`, amount: config.perMinute * duration }
        ];
        break;
      }
      
      case 'photos_to_video': {
        const photoCount = options.photoCount || 0;
        if (photoCount < config.minPhotos) {
          throw new Error(`Minimum ${config.minPhotos} photos required`);
        }
        if (photoCount > config.maxPhotos) {
          throw new Error(`Maximum ${config.maxPhotos} photos allowed`);
        }
        
        baseCost = config.baseCost + (config.perPhoto * photoCount);
        baseCost = Math.min(Math.max(baseCost, config.minCost), config.maxCost);
        
        breakdown = [
          { item: 'Base slideshow fee', amount: config.baseCost },
          { item: `${photoCount} photo(s)`, amount: config.perPhoto * photoCount }
        ];
        break;
      }
      
      default:
        throw new Error(`Unknown service type: ${serviceType}`);
    }

    const finalPrice = parseFloat((baseCost * MARKUP_MULTIPLIER).toFixed(2));
    const markupAmount = parseFloat((finalPrice - baseCost).toFixed(2));

    return {
      serviceType,
      serviceName: config.name,
      baseCost: parseFloat(baseCost.toFixed(2)),
      markupMultiplier: MARKUP_MULTIPLIER,
      markupAmount: markupAmount,
      finalPrice: finalPrice,
      breakdown: breakdown,
      currency: 'KES'
    };
  }

  static formatPrice(priceData) {
    return `KES ${priceData.finalPrice.toFixed(2)}`;
  }

  static getHTMLBreakdown(priceData) {
    let html = `
      <div class="price-breakdown">
        <h4>💰 Price Breakdown</h4>
        <table>
          <tbody>
    `;
    
    priceData.breakdown.forEach(item => {
      html += `
        <tr>
          <td>${item.item}</td>
          <td>KES ${item.amount.toFixed(2)}</td>
        </tr>
      `;
    });
    
    html += `
        <tr class="subtotal">
          <td><strong>Base Cost</strong></td>
          <td><strong>KES ${priceData.baseCost.toFixed(2)}</strong></td>
        </tr>
        <tr class="markup">
          <td>${priceData.markupMultiplier}x Markup</td>
          <td>+ KES ${priceData.markupAmount.toFixed(2)}</td>
        </tr>
        <tr class="total">
          <td><strong>💰 Total</strong></td>
          <td><strong>KES ${priceData.finalPrice.toFixed(2)}</strong></td>
        </tr>
      </tbody></table>
      </div>
    `;
    
    return html;
  }

  // Get all available services
  static getServices() {
    const services = {};
    Object.keys(BASE_COSTS).forEach(key => {
      services[key] = {
        id: key,
        name: BASE_COSTS[key].name,
        baseCost: BASE_COSTS[key].baseCost,
        markupMultiplier: MARKUP_MULTIPLIER,
        estimatedPrice: BASE_COSTS[key].baseCost * MARKUP_MULTIPLIER
      };
    });
    return services;
  }

  // Get service by type
  static getService(serviceType) {
    const config = BASE_COSTS[serviceType];
    if (!config) return null;
    return {
      id: serviceType,
      name: config.name,
      baseCost: config.baseCost,
      markupMultiplier: MARKUP_MULTIPLIER,
      estimatedPrice: config.baseCost * MARKUP_MULTIPLIER
    };
  }
}

module.exports = FeeCalculator;